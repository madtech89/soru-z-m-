import os
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

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


async def generate_coach(context: dict) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"coach-{context.get('user_id', 'x')}",
        system_message=SYSTEM,
    ).with_model("openai", "gpt-5.4")

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
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1] if "```" in text else text
        text = text.replace("json", "", 1).strip()
    try:
        return json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        raise
