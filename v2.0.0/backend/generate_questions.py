"""
generate_questions.py — Otomatik Toplu Soru Havuzu Üretici
===========================================================
Tüm sınav ve alt konular için Gemini / OpenAI API ile ÖSYM standartlarında,
5 şıklı, açıklamalı sorular üretip doğrudan MySQL 'questions' tablosuna kaydeder.

Kullanım:
  python generate_questions.py                          # Tüm konular için 20'şer soru üret
  python generate_questions.py --per-topic 50           # Konu başına 50 soru
  python generate_questions.py --exam "TYT"             # Sadece TYT konuları
  python generate_questions.py --subject "Matematik"    # Sadece Matematik
  python generate_questions.py --concurrency 10         # 10 paralel istek
  python generate_questions.py --dry-run                # Soru üretmeden test et
"""

import asyncio
import argparse
import sys
import os
import uuid
import json
import time
import random
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import aiomysql
from seed import now_iso

DB_CONF = {
    "host":     os.getenv("DB_HOST", "127.0.0.1"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db":       os.getenv("DB_NAME", "sinav"),
    "charset":  "utf8mb4",
    "autocommit": True,
    "connect_timeout": 10,
}

QUESTION_PROMPT = """Sen Türkiye'nin en seçkin {exam_name} soru hazırlama komisyonu uzmanısın.
{exam_name} sınavı formatına ve kazanımlarına %100 uygun, {subject_name} dersi '{topic_name}' konusuna ait tam {count} adet ÖZGÜN, KALİTELİ ve AÇIKLAMALI çoktan seçmeli soru hazırla.

Soruların dağılımı:
- %30 Kolay (Temel kavram & kuralı sorgulayan)
- %40 Orta (Standart ÖSYM tarzı, çok adımlı)
- %30 Zor (Yeni nesil, düşündürücü, öncüllü veya grafik/durum yorumlamalı)

ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON DİZİSİ (ARRAY) OLARAK DÖNDÜR. Markdown kod bloğu veya başka metin ekleme.

JSON Şeması:
[
  {{
    "question_text": "Soru metni buraya (Unicode semboller kullanılabilir)",
    "option_a": "A şıkkı metni",
    "option_b": "B şıkkı metni",
    "option_c": "C şıkkı metni",
    "option_d": "D şıkkı metni",
    "option_e": "E şıkkı metni",
    "correct_answer": "A",
    "difficulty": "orta",
    "explanation": "Adım adım detaylı çözüm ve püf noktası..."
  }}
]
"""

async def call_gemini(prompt: str, api_key: str) -> str:
    import httpx
    default_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    models_to_try = [default_model, "gemini-2.0-flash", "gemini-1.5-flash"]
    models_to_try = list(dict.fromkeys(models_to_try))
    
    last_err = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json"
            },
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(url, json=body)
                if r.status_code == 200:
                    return r.json()["candidates"][0]["content"]["parts"][0]["text"]
                elif r.status_code == 404:
                    continue
                else:
                    r.raise_for_status()
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini API çağrısı başarısız oldu.")

async def call_openai(prompt: str, api_key: str) -> str:
    import httpx
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

class QuestionGenerator:
    def __init__(self, concurrency=8, per_topic=20, dry_run=False):
        self.concurrency = concurrency
        self.per_topic = per_topic
        self.dry_run = dry_run
        self.sem = asyncio.Semaphore(concurrency)
        self.api_keys = self._get_keys()
        self.current_idx = 0
        self._lock = asyncio.Lock()
        self.n_questions_created = 0
        self.n_topics_done = 0
        self.n_topics_total = 0
        self.start_ts = 0.0

    def _get_keys(self):
        keys = []
        raw = os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
        if raw:
            keys = [k.strip() for k in raw.replace(";", ",").replace("\n", ",").split(",") if k.strip()]
        return keys

    async def load_db_keys(self, pool=None):
        if not pool:
            return
        try:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT key_value FROM api_keys WHERE is_active = 1 AND (provider = 'gemini' OR provider IS NULL)")
                    rows = await cur.fetchall()
                    for (kval,) in rows:
                        if kval not in self.api_keys:
                            self.api_keys.append(kval)
        except Exception:
            pass

    async def get_key(self):
        async with self._lock:
            if not self.api_keys:
                return None
            k = self.api_keys[self.current_idx % len(self.api_keys)]
            self.current_idx += 1
            return k

    async def _process_topic(self, pool, row, batch_size=10):
        async with self.sem:
            topic_id = row["topic_id"]
            topic_name = row["topic_name"]
            subject_id = row["subject_id"]
            subject_name = row["subject_name"]
            exam_id = row["exam_id"]
            exam_name = row["exam_name"]

            # Kaç soru üretilecek?
            needed = self.per_topic
            created_for_topic = 0

            # 10'ar 10'ar üret
            while created_for_topic < needed:
                batch_count = min(10, needed - created_for_topic)
                prompt = QUESTION_PROMPT.format(
                    exam_name=exam_name,
                    subject_name=subject_name,
                    topic_name=topic_name,
                    count=batch_count
                )

                if self.dry_run:
                    created_for_topic += batch_count
                    continue

                raw_json = None
                for attempt in range(3):
                    key = await self.get_key()
                    if not key:
                        break
                    try:
                        raw_json = await call_gemini(prompt, key)
                        break
                    except Exception as e:
                        if attempt < 2:
                            await asyncio.sleep(2 ** attempt)

                if not raw_json:
                    break

                try:
                    data = json.loads(raw_json)
                    if isinstance(data, dict):
                        # Bazı modeller {"questions": [...]} dönebilir
                        data = data.get("questions") or data.get("items") or list(data.values())[0]
                    if not isinstance(data, list):
                        continue

                    # Soruları MySQL'e kaydet
                    now_str = now_iso()
                    async with pool.acquire() as conn:
                        async with conn.cursor() as cur:
                            for q in data:
                                q_text = q.get("question_text", "").strip()
                                if not q_text:
                                    continue
                                q_id = str(uuid.uuid4())
                                correct_ans = str(q.get("correct_answer", "A")).strip().upper()[:1]
                                diff = q.get("difficulty", "orta").lower()
                                if diff not in ["kolay", "orta", "zor"]:
                                    diff = "orta"

                                await cur.execute(
                                    """INSERT INTO questions
                                       (id, exam_id, subject_id, topic_id, question_text,
                                        question_type, option_a, option_b, option_c, option_d, option_e,
                                        correct_answer, explanation, difficulty, source, year, tags, status, created_at, updated_at)
                                       VALUES (%s, %s, %s, %s, %s, 'multiple_choice', %s, %s, %s, %s, %s, %s, %s, %s, 'AI Soru Havuzu', 2026, %s, 'active', %s, %s)""",
                                    (
                                        q_id, exam_id, subject_id, topic_id, q_text,
                                        q.get("option_a", ""), q.get("option_b", ""), q.get("option_c", ""),
                                        q.get("option_d", ""), q.get("option_e", ""),
                                        correct_ans, q.get("explanation", ""), diff,
                                        json.dumps([exam_name.lower(), subject_name.lower(), "ai-soru-bankası"]),
                                        now_str, now_str
                                    )
                                )
                                created_for_topic += 1
                                async with self._lock:
                                    self.n_questions_created += 1
                except Exception:
                    pass

            async with self._lock:
                self.n_topics_done += 1
            print(f"✅ [{self.n_topics_done}/{self.n_topics_total}] {exam_name} › {topic_name}: +{created_for_topic} soru havuzuna eklendi.")

    async def run(self, exam_filter=None, subject_filter=None, limit=None):
        if not self.api_keys and not self.dry_run:
            print("❌ HATA: GEMINI_API_KEY bulunamadı!")
            return

        pool = await aiomysql.create_pool(**DB_CONF, minsize=4, maxsize=max(self.concurrency + 4, 15))
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                q = """
                    SELECT t.id topic_id, t.name topic_name,
                           s.id subject_id, s.name subject_name,
                           e.id exam_id, e.name exam_name
                    FROM topics t
                    JOIN subjects s ON t.subject_id = s.id
                    JOIN exams e ON s.exam_id = e.id
                    WHERE 1=1
                """
                params = []
                if exam_filter:
                    q += " AND e.name LIKE %s"; params.append(f"%{exam_filter}%")
                if subject_filter:
                    q += " AND s.name LIKE %s"; params.append(f"%{subject_filter}%")
                q += " ORDER BY e.name, s.name, t.name"
                if limit:
                    q += f" LIMIT {int(limit)}"
                await cur.execute(q, params)
                topics = await cur.fetchall()

        self.n_topics_total = len(topics)
        self.start_ts = time.time()
        print(f"\n🚀 Soru Üretimi Başlatılıyor: {self.n_topics_total} konu x {self.per_topic} soru (Hedef: {self.n_topics_total * self.per_topic} soru)")

        tasks = [self._process_topic(pool, row) for row in topics]
        await asyncio.gather(*tasks)

        pool.close()
        await pool.wait_closed()

        elapsed = time.time() - self.start_ts
        print(f"\n🏁 Tamamlandı! Toplam {self.n_questions_created} soru {elapsed:.1f} saniyede üretilip veritabanına kaydedildi.")

async def main():
    parser = argparse.ArgumentParser(description="HedefMatik — Soru Havuzu Üretici")
    parser.add_argument("--exam", help="Sadece bu sınav türü")
    parser.add_argument("--subject", help="Sadece bu ders")
    parser.add_argument("--per-topic", type=int, default=20, help="Konu başına soru sayısı (varsayılan: 20)")
    parser.add_argument("--concurrency", type=int, default=8, help="Eşzamanlı istek sayısı")
    parser.add_argument("--limit", type=int, help="Maksimum işlenecek konu sayısı")
    parser.add_argument("--dry-run", action="store_true", help="İçerik üretmeden listele")
    args = parser.parse_args()

    gen = QuestionGenerator(concurrency=args.concurrency, per_topic=args.per_topic, dry_run=args.dry_run)
    await gen.run(exam_filter=args.exam, subject_filter=args.subject, limit=args.limit)

if __name__ == "__main__":
    asyncio.run(main())
