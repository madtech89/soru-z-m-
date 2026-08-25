"""
generate_content.py — Paralel & Hızlı Konu Anlatımı Üretici
=============================================================
Tüm sınav konuları için Gemini/OpenAI API ile içerik üretir.
Eşzamanlı işlem (asyncio.Semaphore) ve toplu MySQL yazımı sayesinde
sıralı scriptten 8-10x daha hızlıdır.

Kullanım:
  python generate_content.py                        # Tüm konular (10 paralel)
  python generate_content.py --concurrency 20       # 20 paralel (dikkat: rate limit)
  python generate_content.py --exam "TYT"           # Sadece TYT konuları
  python generate_content.py --subject "Matematik"  # Sadece Matematik
  python generate_content.py --limit 20             # İlk 20 konu
  python generate_content.py --dry-run              # Üretmeden listele

Hız Kılavuzu:
  Gemini 1.5 Flash Ücretsiz : 15 req/dk → --concurrency 5  (~6 dk / 642 konu)
  Gemini 1.5 Flash Ücretli  : 1000 req/dk → --concurrency 20 (~2 dk / 642 konu)
  OpenAI GPT-4o-mini         : 500 req/dk → --concurrency 15 (~3 dk / 642 konu)
"""

import asyncio
import argparse
import sys
import os
import uuid
import json
import time
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import aiomysql
from seed import now_iso

# ─── Veritabanı ───────────────────────────────────────────────────────────────
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

# ─── Ultra-Detaylı "Sıfırdan En İleriye" Konu Anlatımı Şablonu ────────────────
PROMPT_TEMPLATE = """Sen Türkiye'nin en başarılı, en sevilen ve pedagojik olarak en usta {exam_name} hazırlık eğitmenisin.
{exam_name} sınavına hazırlanan bir öğrenciye {subject_name} dersinin '{topic_name}' konusunu SIFIRDAN, HİÇBİR ŞEYİ BİLMEDİĞİNİ VARSAYARAK ("en temelden, en sade, en anlaşılır ve mantığını kavratacak şekilde") anlatacaksın.

Dökümanı eksiksiz, son derece doyurucu ve zengin bir biçimde şu ana başlıklarla oluştur:

# 🌟 {topic_name} — Sıfırdan Zirveye Konu Anlatımı

## 📌 1. Bu Konu Nedir ve Günlük Hayatta Ne İşe Yarar?
- Konuyu en temel, somut bir analoji veya günlük hayat örneğiyle açıkla.
- Öğrencinin kafasındaki "Ben bunu neden öğreniyorum?" sorusunu ortadan kaldır.
- {exam_name} sınavında bu konudan ortalama kaç soru çıktığını ve önemini belirt.

## 🧠 2. Temel Kavramlar & Mantığın Özü (Ezber Yok, Mantık Var!)
- Sıfırdan tüm terimleri, tanımları tek tek açıkla.
- Kuralların VE formüllerin neden öyle olduğunu mantığıyla göster (Ezberletme, ispatını/mantığını anlat).
- Formülleri ve kuralları şık kutucuklar veya net maddeler halinde listele (Unicode semboller: ², ³, √, π, ≤, ≥, ±, ≠).

## ⚠️ 3. ÖSYM'nin En Sevdiği Tuzaklar & Çeldiriciler
- Öğrencilerin bu konuda sınavda en sık düştüğü 3 büyük hata.
- Soru köklerindeki gizli kelimeler ("kesinlikle", "olabilir", "en az", "daima" vb.).
- Zaman kazandıran altın pratik taktikler ve kısayollar.

## 📝 4. Adım Adım Seviye Seviye Çözümlü Örnekler

### 🟢 Seviye 1: Isınma & Temel Soru (Kolay)
- **Soru:** (Temel kuralı doğrudan uygulatan net bir soru)
- **Çözüm:** (Adım adım 1., 2., 3. adım şeklinde tane tane çözüm)

### 🟡 Seviye 2: Kavrama & Standart Sınav Sorusu (Orta)
- **Soru:** (ÖSYM standardında çok adımlı soru)
- **Çözüm:** (Mantık yürütme aşamaları ve adım adım çözüm)

### 🔴 Seviye 3: Yeni Nesil / Beceri Temelli ÖSYM Sorusu (Zor & Düşündürücü)
- **Soru:** (Hikayeli, şekilli/mantık yürütmeli veya öncüllü yeni nesil soru)
- **Çözüm:** (Soruyu parçalama, formülize etme ve hatasız sonuca ulaşma rehberi)

## 📊 5. Konu Özeti & Hafıza Kartı (Son Tekrar Tablosu)
- Konunun tüm can alıcı formüllerini ve kurallarını içeren 1 dakikalık özet mini tablo/liste.

## 🚀 6. Sırada Ne Var?
- Bu konuyu bitiren öğrencinin hemen peşinden çözmesi gereken test sayısı (ör: "Hemen 20 soruluk pekiştirme testini çöz!") ve bir sonraki bağlantılı konu.

Türkçe dil bilgisine tam uygun, heyecan verici, motive edici ve öğrenci dostu bir üslup kullan."""



# ─── API Çağrıları ────────────────────────────────────────────────────────────
async def call_gemini(prompt: str, api_key: str) -> str:
    import httpx
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.65, "maxOutputTokens": 2048, "topP": 0.9},
    }
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(url, json=body)
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]


async def call_openai(prompt: str, api_key: str) -> str:
    import httpx
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
        "temperature": 0.65,
    }
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


# ─── Key Rotasyonu ────────────────────────────────────────────────────────────
class KeyRotator:
    def __init__(self):
        self.pools = {}
        self._idx = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        for var, provider in [
            ("GEMINI_API_KEYS", "gemini"), ("GEMINI_API_KEY", "gemini"), ("GOOGLE_API_KEY", "gemini"),
            ("OPENAI_API_KEYS", "openai"), ("OPENAI_API_KEY", "openai"),
        ]:
            raw = os.getenv(var, "").strip()
            if not raw:
                continue
            keys = [k.strip() for k in raw.replace(";", ",").replace("\n", ",").split(",") if k.strip()]
            if keys:
                if provider not in self.pools:
                    self.pools[provider] = []
                for k in keys:
                    if k not in self.pools[provider]:
                        self.pools[provider].append(k)

    async def next_key(self, preferred="gemini"):
        async with self._lock:
            for provider in ([preferred] + [p for p in self.pools if p != preferred]):
                pool = self.pools.get(provider, [])
                if not pool:
                    continue
                idx = self._idx.get(provider, 0) % len(pool)
                self._idx[provider] = idx + 1
                return provider, pool[idx]
        return None, None

    def summary(self):
        return {p: len(keys) for p, keys in self.pools.items()}


# ─── Paralel Üretici ─────────────────────────────────────────────────────────
class ParallelGenerator:

    def __init__(self, concurrency: int = 10, dry_run: bool = False):
        self.concurrency = concurrency
        self.dry_run = dry_run
        self.rotator = KeyRotator()
        self.sem = asyncio.Semaphore(concurrency)

        # Sayaçlar (thread-safe lock ile)
        self._lock = asyncio.Lock()
        self.n_success = 0
        self.n_skipped = 0
        self.n_failed  = 0
        self.n_total   = 0
        self.start_ts  = 0.0

        if not self.rotator.pools:
            print("❌ HATA: Hiç API key bulunamadı!")
            print("   .env dosyasına GEMINI_API_KEY veya OPENAI_API_KEY ekleyin.")
            sys.exit(1)

        print(f"✅ API Key'ler: {self.rotator.summary()}")
        print(f"⚡ Eşzamanlılık: {concurrency} paralel istek")

    # ── Tek konu için iş akışı ────────────────────────────────────────────────
    async def _process_one(self, pool, row: dict):
        async with self.sem:
            topic_id   = row["topic_id"]
            topic_name = row["topic_name"]
            subject_id = row["subject_id"]
            subject_name = row["subject_name"]
            exam_id    = row["exam_id"]
            exam_name  = row["exam_name"]

            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    # Zaten üretilmiş mi?
                    await cur.execute(
                        "SELECT id FROM notes WHERE topic_id=%s AND title LIKE %s LIMIT 1",
                        (topic_id, f"%Konu Anlatımı%"),
                    )
                    if await cur.fetchone():
                        async with self._lock:
                            self.n_skipped += 1
                        self._print_progress(f"⏩ {exam_name} › {topic_name}")
                        return

            if self.dry_run:
                async with self._lock:
                    self.n_success += 1
                self._print_progress(f"🔎 {exam_name} › {topic_name}")
                return

            # İçerik üret
            prompt = PROMPT_TEMPLATE.format(
                exam_name=exam_name,
                subject_name=subject_name,
                topic_name=topic_name,
            )

            content = None
            for attempt in range(3):     # 3 deneme hakkı
                try:
                    provider, key = await self.rotator.next_key()
                    if not key:
                        raise Exception("Kullanılabilir API key yok")

                    if provider == "gemini":
                        content = await call_gemini(prompt, key)
                    else:
                        content = await call_openai(prompt, key)
                    break

                except Exception as e:
                    err = str(e)[:60]
                    if attempt < 2:
                        await asyncio.sleep(2 ** attempt)   # 1s, 2s backoff
                    else:
                        async with self._lock:
                            self.n_failed += 1
                        self._print_progress(f"❌ {exam_name} › {topic_name} — {err}")
                        return

            # MySQL'e kaydet
            note_id = str(uuid.uuid4())
            now = now_iso()
            tags = json.dumps(["konu-anlatımı", "ai-üretim", exam_name.lower().replace(" ", "-")])

            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """INSERT INTO notes
                           (id, exam_id, subject_id, topic_id, title, description,
                            content, video_url, author, tags, created_at, updated_at)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,'',%s,%s,%s,%s)
                           ON DUPLICATE KEY UPDATE updated_at=VALUES(updated_at)""",
                        (
                            note_id, exam_id, subject_id, topic_id,
                            f"📖 {topic_name} — Konu Anlatımı",
                            f"{exam_name} sınavı için {subject_name} › {topic_name} konusunun detaylı anlatımı.",
                            content,
                            "AI Asistan",
                            tags, now, now,
                        ),
                    )

            async with self._lock:
                self.n_success += 1
            self._print_progress(f"✅ {exam_name} › {topic_name} ({len(content)} kr)")

    # ── Çıktı ─────────────────────────────────────────────────────────────────
    def _print_progress(self, msg: str):
        done = self.n_success + self.n_skipped + self.n_failed
        elapsed = time.time() - self.start_ts
        if done > 0 and elapsed > 0:
            rate = done / elapsed
            remaining = (self.n_total - done) / rate if rate > 0 else 0
            eta = f"  ETA ~{remaining:.0f}s" if remaining > 5 else ""
        else:
            eta = ""
        bar_done = int(done / max(self.n_total, 1) * 20)
        bar = f"[{'█' * bar_done}{'░' * (20 - bar_done)}] {done}/{self.n_total}{eta}"
        print(f"{bar}  {msg}")

    # ── Ana çalıştırıcı ───────────────────────────────────────────────────────
    async def run(
        self,
        exam_filter: str = None,
        subject_filter: str = None,
        limit: int = None,
    ):
        # Veritabanı bağlantı havuzu (üretim için büyük pool)
        pool = await aiomysql.create_pool(
            **DB_CONF,
            minsize=5,
            maxsize=max(self.concurrency + 5, 20),
            pool_recycle=3600,
        )

        # Konuları çek
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                q = """
                    SELECT t.id topic_id, t.name topic_name,
                           s.id subject_id, s.name subject_name,
                           e.id exam_id, e.name exam_name
                    FROM   topics t
                    JOIN   subjects s ON t.subject_id = s.id
                    JOIN   exams    e ON s.exam_id    = e.id
                    WHERE  1=1
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

        self.n_total  = len(topics)
        self.start_ts = time.time()

        print(f"\n{'━'*60}")
        print(f"📚 Toplam konu: {self.n_total} | Paralel: {self.concurrency}")
        print(f"{'━'*60}\n")

        if self.n_total == 0:
            print("⚠️  Filtrelerle eşleşen konu bulunamadı.")
            pool.close(); return

        # Tüm konuları eşzamanlı olarak işle
        tasks = [self._process_one(pool, row) for row in topics]
        await asyncio.gather(*tasks)

        pool.close()
        await pool.wait_closed()
        self._summary()

    def _summary(self):
        elapsed = time.time() - self.start_ts
        print(f"\n{'═'*60}")
        print(f"🏁 TAMAMLANDI — {elapsed:.1f} saniyede ({elapsed/60:.1f} dakika)")
        print(f"{'═'*60}")
        print(f"  ✅ Oluşturulan  : {self.n_success}")
        print(f"  ⏩ Zaten vardı  : {self.n_skipped}")
        print(f"  ❌ Başarısız    : {self.n_failed}")
        print(f"  📚 Toplam konu  : {self.n_total}")
        if self.n_success > 0:
            rate = self.n_success / elapsed
            print(f"  ⚡ Hız          : {rate:.1f} konu/saniye")
        print(f"{'═'*60}")


# ─── CLI ──────────────────────────────────────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser(
        description="HedefMatik — Paralel Konu Anlatımı Üretici",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--exam",        help="Sadece bu sınav türü (ör: TYT, KPSS)")
    parser.add_argument("--subject",     help="Sadece bu ders (ör: Matematik)")
    parser.add_argument("--limit",       type=int, help="Maksimum konu sayısı")
    parser.add_argument("--concurrency", type=int, default=10,
                        help="Eşzamanlı istek sayısı (varsayılan: 10)")
    parser.add_argument("--dry-run",     action="store_true",
                        help="API çağrısı yapmadan konuları listele")
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 HedefMatik — Paralel İçerik Üretici")
    print(f"   Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    gen = ParallelGenerator(
        concurrency=args.concurrency,
        dry_run=args.dry_run,
    )
    await gen.run(
        exam_filter=args.exam,
        subject_filter=args.subject,
        limit=args.limit,
    )


if __name__ == "__main__":
    asyncio.run(main())
