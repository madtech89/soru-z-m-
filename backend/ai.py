import os
import json
import logging
import asyncio

logger = logging.getLogger("sinav.ai")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM = (
    "Sen Türkiye sınav hazırlık platformu 'Netor'un yapay zekâ çalışma koçusun. "
    "Öğrencinin GERÇEK performans verilerine dayanarak, motive edici ama gerçekçi, "
    "Türkçe öneriler üretirsin. Asla rastgele tavsiye verme; verilen verilere dayan. "
    "Cevabını YALNIZCA geçerli JSON olarak, şu şemayla döndür: "
    '{"analysis": "2-4 cümlelik kişisel analiz", '
    '"focus_topics": ["konu1", "konu2", "konu3"], '
    '"daily_questions": 30, '
    '"weekly_plan": [{"day": "Pazartesi", "subject": "Matematik", "topic": "Problemler", "task": "Ders notu + 30 soru"}], '
    '"motivation": "kısa motivasyon cümlesi"}. '
    "weekly_plan tam 7 gün içermeli (Pazartesi..Pazar)."
)


def _generate_fallback(context: dict) -> dict:
    """Intelligent dynamic local coach generator based on actual student metrics."""
    weak = context.get("weak") or []
    weak_names = [w["topic_name"] if isinstance(w, dict) else str(w) for w in weak]
    strong = context.get("strong") or []
    
    daily_goal = context.get("daily_goal") or 25
    target_exam = context.get("target_exam") or "Genel Sınav"
    target_score = context.get("target_score") or "Hedef Puan"
    overall = context.get("overall_success", 0)

    focus = weak_names[:3] if weak_names else ["Temel Kavramlar", "Paragraf / Anlam Bilgisi", "Sayı Problemleri"]
    
    days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    weekly_plan = []
    
    for i, day in enumerate(days):
        topic = focus[i % len(focus)]
        if day == "Pazar":
            task = "Haftalık genel tekrar ve deneme sınavı çözümü (Özet çıkarma)"
            subj = "Genel Deneme"
        elif day == "Cumartesi":
            task = f"{daily_goal + 10} soru soru bankası çözümü ve eksik analizi"
            subj = "Pekiştirme"
        else:
            task = f"Konu özeti okuma + {daily_goal} soru çözüm pratiği"
            subj = "Çalışma"
            
        weekly_plan.append({
            "day": day,
            "subject": subj,
            "topic": topic,
            "task": task
        })
        
    analysis = (
        f"{target_exam} hazırlığında genel başarı oranın %{overall}. "
        f"{'Zayıf olduğun ' + ', '.join(focus[:2]) + ' konularına öncelik vererek netlerini hızla artırabilirsin.' if weak_names else 'Düzenli soru çözümü ve deneme pratikleriyle hedefine emin adımlarla ilerliyorsun.'} "
        f"Günlük {daily_goal} soru hedefini aksatmadan 7 günlük planı takip etmelisin."
    )
    
    motivation = "Disiplin, yeteneğin her gün tekrar edilen halidir. Başarı adım adım gelir!"
    
    return {
        "analysis": analysis,
        "focus_topics": focus,
        "daily_questions": daily_goal,
        "weekly_plan": weekly_plan,
        "motivation": motivation
    }


def _clean_json_str(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:].strip()
    try:
        return json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        raise


async def _call_gemini(prompt: str) -> dict:
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    def _run_sync():
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        return response.text

    loop = asyncio.get_running_loop()
    text = await loop.run_in_executor(None, _run_sync)
    return _clean_json_str(text)


async def _call_openai(prompt: str) -> dict:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"} if "gpt" in OPENAI_MODEL else None,
        temperature=0.7,
    )
    return _clean_json_str(response.choices[0].message.content)


async def generate_coach(context: dict) -> dict:
    prompt = (
        f"Öğrenci verileri:\n"
        f"- Hedef sınav: {context.get('target_exam', 'belirsiz')}\n"
        f"- Hedef puan: {context.get('target_score', 'belirsiz')}\n"
        f"- Ortalama deneme puanı: {context.get('avg_score')}\n"
        f"- Günlük soru hedefi: {context.get('daily_goal')}\n"
        f"- Toplam çözülen soru: {context.get('total_solved')}\n"
        f"- Genel başarı oranı: %{context.get('overall_success')}\n"
        f"- Zayıf konular: {context.get('weak', [])}\n"
        f"- Güçlü konular: {context.get('strong', [])}\n\n"
        f"Bu verilere göre kişisel analiz ve 7 günlük çalışma planı üret. Sadece JSON döndür."
    )

    if GEMINI_API_KEY:
        try:
            return await _call_gemini(prompt)
        except Exception as ex:
            logger.warning(f"Google Gemini call failed ({ex}), trying fallback...")
            
    if OPENAI_API_KEY:
        try:
            return await _call_openai(prompt)
        except Exception as ex:
            logger.warning(f"OpenAI call failed ({ex}), trying fallback...")

    logger.info("Using built-in intelligent coach generator")
    return _generate_fallback(context)
