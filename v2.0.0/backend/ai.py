import os
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("sinav.ai")

SYSTEM_COACH = (
    "Sen Türkiye sınav hazırlık ve tercih rehberliği platformu 'HedefMatik'in yapay zekâ çalışma koçusun. "
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

SYSTEM_CHAT = (
    "Sen Türkiye sınavlarına (YKS, KPSS, TUS, DGS, ALES, LGS, YDS vb.) hazırlanan öğrencilere "
    "yardımcı olan uzman bir özel ders öğretmenisin. Soruları adım adım açıkla, formülleri ve "
    "püf noktalarını net bir şekilde göster, motive et ve Türkçe yanıt ver."
)


def mask_key(key: str) -> str:
    """Mask key for maximum privacy in logs and admin status."""
    if not key:
        return ""
    clean = key.strip()
    if len(clean) <= 10:
        return "********"
    return f"{clean[:6]}...****...{clean[-4:]}"


class KeyEntry:
    def __init__(self, key: str, provider: str):
        self.key = key.strip()
        self.provider = provider
        self.masked = mask_key(self.key)
        self.status = "active"  # "active", "rate_limited", "failed"
        self.cooldown_until = 0.0
        self.fail_count = 0
        self.success_count = 0

    def is_available(self) -> bool:
        if self.status == "active":
            return True
        if self.status == "rate_limited" and time.time() > self.cooldown_until:
            self.status = "active"
            return True
        return False

    def mark_success(self):
        self.status = "active"
        self.fail_count = 0
        self.success_count += 1

    def mark_rate_limited(self, cooldown_seconds: float = 60.0):
        self.status = "rate_limited"
        self.cooldown_until = time.time() + cooldown_seconds
        self.fail_count += 1
        logger.warning(f"AI key [{self.provider} - {self.masked}] rate-limited. Cooldown: {cooldown_seconds}s")

    def mark_failed(self):
        self.fail_count += 1
        if self.fail_count >= 3:
            self.status = "failed"
            self.cooldown_until = time.time() + 300.0  # 5 min cooldown
        else:
            self.status = "rate_limited"
            self.cooldown_until = time.time() + 30.0


class MultiAIKeyManager:
    """Multi-Provider, Multi-Key Resilient AI Vault with Automatic Failover."""

    def __init__(self):
        self.pools: Dict[str, List[KeyEntry]] = {}
        self.reload_keys()

    def reload_keys(self):
        self.pools = {
            "gemini": self._parse_keys(["GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY"], "gemini"),
            "openai": self._parse_keys(["OPENAI_API_KEYS", "OPENAI_API_KEY"], "openai"),
            "deepseek": self._parse_keys(["DEEPSEEK_API_KEYS", "DEEPSEEK_API_KEY"], "deepseek"),
            "groq": self._parse_keys(["GROQ_API_KEYS", "GROQ_API_KEY"], "groq"),
            "anthropic": self._parse_keys(["ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY", "CLAUDE_API_KEY"], "anthropic"),
        }
        total_keys = sum(len(k) for k in self.pools.values())
        logger.info(f"AI Key Manager initialized with {total_keys} total keys across {len(self.pools)} providers.")

    def _parse_keys(self, env_vars: List[str], provider: str) -> List[KeyEntry]:
        found = []
        for var in env_vars:
            val = os.environ.get(var, "").strip()
            if not val:
                continue
            # Split comma, semicolon or newline separated keys
            parts = [k.strip() for k in val.replace(";", ",").replace("\n", ",").split(",") if k.strip()]
            for p in parts:
                if p and not any(e.key == p for e in found):
                    found.append(KeyEntry(p, provider))
        return found

    def get_available_key(self, provider: str) -> Optional[KeyEntry]:
        entries = self.pools.get(provider, [])
        for entry in entries:
            if entry.is_available():
                return entry
        return None

    def get_status_summary(self) -> Dict[str, Any]:
        summary = {}
        for provider, entries in self.pools.items():
            summary[provider] = {
                "total_keys": len(entries),
                "active_keys": sum(1 for e in entries if e.is_available()),
                "keys": [
                    {
                        "masked": e.masked,
                        "status": e.status,
                        "successes": e.success_count,
                        "fails": e.fail_count,
                    }
                    for e in entries
                ],
            }
        return summary


# Global Singleton Key Manager
key_manager = MultiAIKeyManager()


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


# ============ PROVIDER CALLERS WITH MULTI-KEY FAILOVER ============

async def _call_gemini_with_failover(prompt: str, system: str = SYSTEM_COACH, is_json: bool = True) -> str:
    gemini_entries = [e for e in key_manager.pools.get("gemini", []) if e.is_available()]
    if not gemini_entries:
        raise RuntimeError("No available Gemini API keys")

    from google import genai
    from google.genai import types

    last_error = None
    for entry in gemini_entries:
        try:
            client = genai.Client(api_key=entry.key)
            
            def _sync_call():
                model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
                config_args = {
                    "system_instruction": system,
                    "temperature": 0.7,
                }
                if is_json:
                    config_args["response_mime_type"] = "application/json"
                
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_args),
                )
                return resp.text

            loop = asyncio.get_running_loop()
            text = await loop.run_in_executor(None, _sync_call)
            if text:
                entry.mark_success()
                return text
        except Exception as ex:
            last_error = ex
            err_str = str(ex).lower()
            if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str:
                entry.mark_rate_limited(cooldown_seconds=120.0)
            else:
                entry.mark_failed()
            logger.warning(f"Gemini key [{entry.masked}] failed: {ex}. Trying next key...")

    raise last_error or RuntimeError("All Gemini keys failed")


async def _call_openai_compatible_with_failover(
    provider_name: str,
    prompt: str,
    base_url: Optional[str] = None,
    default_model: str = "gpt-4o-mini",
    system: str = SYSTEM_COACH,
    is_json: bool = True
) -> str:
    entries = [e for e in key_manager.pools.get(provider_name, []) if e.is_available()]
    if not entries:
        raise RuntimeError(f"No available {provider_name} API keys")

    from openai import AsyncOpenAI

    last_error = None
    for entry in entries:
        try:
            kwargs = {"api_key": entry.key}
            if base_url:
                kwargs["base_url"] = base_url
            client = AsyncOpenAI(**kwargs)

            model_name = os.environ.get(f"{provider_name.upper()}_MODEL", default_model)
            call_kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
            }
            if is_json and "gpt" in model_name:
                call_kwargs["response_format"] = {"type": "json_object"}

            response = await client.chat.completions.create(**call_kwargs)
            content = response.choices[0].message.content
            if content:
                entry.mark_success()
                return content
        except Exception as ex:
            last_error = ex
            err_str = str(ex).lower()
            if "429" in err_str or "rate limit" in err_str or "quota" in err_str:
                entry.mark_rate_limited(cooldown_seconds=120.0)
            else:
                entry.mark_failed()
            logger.warning(f"{provider_name} key [{entry.masked}] failed: {ex}. Trying next key...")

    raise last_error or RuntimeError(f"All {provider_name} keys failed")


# ============ PUBLIC UNIFIED AI INTERFACES ============

async def call_resilient_ai(system: str, prompt: str, is_json: bool = True) -> str:
    """Unified resilient AI caller with multi-key and multi-provider failover."""
    # 1. Gemini
    if key_manager.pools.get("gemini"):
        try:
            return await _call_gemini_with_failover(prompt, system=system, is_json=is_json)
        except Exception as ex:
            logger.warning(f"Gemini failover exhausted: {ex}")

    # 2. OpenAI
    if key_manager.pools.get("openai"):
        try:
            return await _call_openai_compatible_with_failover("openai", prompt, default_model="gpt-4o-mini", system=system, is_json=is_json)
        except Exception as ex:
            logger.warning(f"OpenAI failover exhausted: {ex}")

    # 3. DeepSeek
    if key_manager.pools.get("deepseek"):
        try:
            return await _call_openai_compatible_with_failover("deepseek", prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=system, is_json=is_json)
        except Exception as ex:
            logger.warning(f"DeepSeek failover exhausted: {ex}")

    # 4. Groq
    if key_manager.pools.get("groq"):
        try:
            return await _call_openai_compatible_with_failover("groq", prompt, base_url="https://api.groq.com/openai/v1", default_model="llama-3.3-70b-versatile", system=system, is_json=is_json)
        except Exception as ex:
            logger.warning(f"Groq failover exhausted: {ex}")

    return ""


async def generate_coach(context: dict) -> dict:

    """Generate study coach plan with automatic provider and key failover."""
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

    # 1. Try Google Gemini Keys (if available)
    if key_manager.pools.get("gemini"):
        try:
            raw_json = await _call_gemini_with_failover(prompt, system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"Google Gemini multi-key failover exhausted: {ex}")

    # 2. Try OpenAI Keys (if available)
    if key_manager.pools.get("openai"):
        try:
            raw_json = await _call_openai_compatible_with_failover("openai", prompt, default_model="gpt-4o-mini", system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"OpenAI multi-key failover exhausted: {ex}")

    # 3. Try DeepSeek Keys (if available)
    if key_manager.pools.get("deepseek"):
        try:
            raw_json = await _call_openai_compatible_with_failover("deepseek", prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"DeepSeek multi-key failover exhausted: {ex}")

    # 4. Try Groq Keys (if available)
    if key_manager.pools.get("groq"):
        try:
            raw_json = await _call_openai_compatible_with_failover("groq", prompt, base_url="https://api.groq.com/openai/v1", default_model="llama-3.3-70b-versatile", system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"Groq multi-key failover exhausted: {ex}")

    # 5. Smart Local Engine Fallback (Zero-Downtime Guarantee)
    logger.info("Using built-in intelligent coach generator fallback.")
    return _generate_local_fallback(context)


async def generate_chat_reply(user_message: str, history: List[Dict[str, str]] = None, user_name: str = "Öğrenci") -> str:
    """Generate conversational AI assistant reply with multi-key failover."""
    prompt = f"Öğrenci ({user_name}): {user_message}"

    # 1. Gemini
    if key_manager.pools.get("gemini"):
        try:
            return await _call_gemini_with_failover(prompt, system=SYSTEM_CHAT, is_json=False)
        except Exception as ex:
            logger.warning(f"Chat: Gemini failover exhausted: {ex}")

    # 2. OpenAI
    if key_manager.pools.get("openai"):
        try:
            return await _call_openai_compatible_with_failover("openai", prompt, default_model="gpt-4o-mini", system=SYSTEM_CHAT, is_json=False)
        except Exception as ex:
            logger.warning(f"Chat: OpenAI failover exhausted: {ex}")

    # 3. DeepSeek
    if key_manager.pools.get("deepseek"):
        try:
            return await _call_openai_compatible_with_failover("deepseek", prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=SYSTEM_CHAT, is_json=False)
        except Exception as ex:
            logger.warning(f"Chat: DeepSeek failover exhausted: {ex}")

    # 4. Groq
    if key_manager.pools.get("groq"):
        try:
            return await _call_openai_compatible_with_failover("groq", prompt, base_url="https://api.groq.com/openai/v1", default_model="llama-3.3-70b-versatile", system=SYSTEM_CHAT, is_json=False)
        except Exception as ex:
            logger.warning(f"Chat: Groq failover exhausted: {ex}")

    # 5. Local Fallback
    return (
        f"Harika bir soru! {user_name}, bu konuyu pekiştirmek için konu anlatım özetlerini okuyabilir "
        f"ve soru bankasındaki testleri çözebilirsin. Başarı düzenli tekrarda saklıdır!"
    )


def _generate_local_fallback(context: dict) -> dict:
    """Intelligent dynamic local coach generator based on student metrics."""
    weak = context.get("weak") or []
    weak_names = [w["topic_name"] if isinstance(w, dict) else str(w) for w in weak]
    
    daily_goal = context.get("daily_goal") or 25
    target_exam = context.get("target_exam") or "Genel Sınav"
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


SYSTEM_EXAM_ANALYSIS = (
    "Sen Türkiye ulusal sınavları (YKS TYT/AYT, LGS, KPSS, ALES, DGS, MSÜ) konusunda uzmanlaşmış bir Yapay Zekâ Sınav Teşhis ve Başarı Koçusun. "
    "Öğrencinin girdiği denemedeki netlerini, doğru/yanlış/boş sayılarını, branş bazlı başarılarını ve konu eksiklerini derinlemesine incelersin. "
    "Öğrencinin eksik olduğu yerleri net olarak açıklar, 100 üzerinden bir 'Genel Hazırlık & Yeterlilik Puanı' (readiness_score) belirler, "
    "ve 7 günlük kişiselleştirilmiş kurtarma yol haritası çıkarırsın. "
    "Cevabını YALNIZCA geçerli JSON formatında, şu şemayla döndür:\n"
    "{\n"
    '  "readiness_score": 82,\n'
    '  "evaluation": "2-3 cümlelik gerçekçi ve yapıcı seviye değerlendirmesi",\n'
    '  "critical_weaknesses": [\n'
    '    {"subject": "Ders Adı", "topic": "Konu Adı", "reason": "Neden eksik ve ne yapılmalı", "urgency": "Yüksek"}\n'
    '  ],\n'
    '  "strengths": [\n'
    '    {"subject": "Ders Adı", "topic": "Konu Adı", "praise": "Başarılı olduğu alan"}\n'
    '  ],\n'
    '  "subject_scores": {\n'
    '    "Matematik": 75,\n'
    '    "Türkçe": 88\n'
    '  },\n'
    '  "action_plan_7days": [\n'
    '    {"day": 1, "day_name": "Pazartesi", "focus": "Çalışılacak konu", "task": "Not özeti + 30 soru"}\n'
    '  ],\n'
    '  "strategic_advice": "Sınav anı taktiği veya zaman yönetimi tavsiyesi"\n'
    "}"
)


async def generate_exam_diagnosis(context: Dict[str, Any]) -> Dict[str, Any]:
    """Generates 100-point AI exam diagnosis and topic breakdown using resilient AI keys with multi-provider failover."""
    user_prompt = f"Öğrencinin Çözdüğü Deneme Sınavı Verileri:\n{json.dumps(context, ensure_ascii=False, indent=2)}\n\nBu verilere göre 100 üzerinden yeterlilik puanı, zayıf/güçlü konular ve 7 günlük kurtarma planı üret. Sadece JSON döndür."

    # 1. Try Gemini
    if key_manager.pools.get("gemini"):
        try:
            raw_json = await _call_gemini_with_failover(user_prompt, system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"Gemini exam diagnosis failover exhausted: {ex}")

    # 2. Try OpenAI
    if key_manager.pools.get("openai"):
        try:
            raw_json = await _call_openai_compatible_with_failover("openai", user_prompt, default_model="gpt-4o-mini", system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"OpenAI exam diagnosis failover exhausted: {ex}")

    # 3. Try DeepSeek
    if key_manager.pools.get("deepseek"):
        try:
            raw_json = await _call_openai_compatible_with_failover("deepseek", user_prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"DeepSeek exam diagnosis failover exhausted: {ex}")

    # 4. Try Groq
    if key_manager.pools.get("groq"):
        try:
            raw_json = await _call_openai_compatible_with_failover("groq", user_prompt, base_url="https://api.groq.com/openai/v1", default_model="llama-3.3-70b-versatile", system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"Groq exam diagnosis failover exhausted: {ex}")

    # 5. Local intelligent diagnostic fallback
    return _fallback_exam_diagnosis(context)



def _fallback_exam_diagnosis(context: Dict[str, Any]) -> Dict[str, Any]:
    """Algorithmic intelligent 100-point diagnostic fallback."""
    total = context.get("total", 0) or 1
    correct = context.get("correct", 0)
    wrong = context.get("wrong", 0)
    blank = context.get("blank", 0)
    net = context.get("net", 0.0)
    test_name = context.get("test_name", "Deneme Sınavı")
    sections = context.get("sections", {})
    weak_topics = context.get("weak_topics", [])

    # Calculate 100-point score
    base_ratio = (correct / total) if total > 0 else 0
    penalty_ratio = (wrong * 0.25) / total if total > 0 else 0
    calculated_score = max(10, min(100, round((base_ratio - penalty_ratio) * 100)))

    subject_scores = {}
    critical_weaknesses = []
    strengths = []

    for sname, sdata in sections.items():
        stotal = sdata.get("total", 0) or 1
        scorrect = sdata.get("correct", 0)
        srate = round((scorrect / stotal) * 100)
        subject_scores[sname] = srate
        if srate < 60:
            critical_weaknesses.append({
                "subject": sname,
                "topic": f"{sname} Genel Eksikler",
                "reason": f"{stotal} soruda {scorrect} doğru ({stotal - scorrect} yanlış/boş)",
                "urgency": "Yüksek" if srate < 40 else "Orta",
            })
        else:
            strengths.append({
                "subject": sname,
                "topic": f"{sname} Başarısı",
                "praise": f"%{srate} başarı oranı ile güçlü seviyede",
            })

    days = [
        ("1. Gün - Pazartesi", "En çok yanlış yapılan 1. konunun ders notu + 30 soru"),
        ("2. Gün - Salı", "Formül ve kural tekrarı + 35 pekiştirme sorusu"),
        ("3. Gün - Çarşamba", "2. zayıf konunun video/ders notu incelemesi + soru pratiği"),
        ("4. Gün - Perşembe", "Süre tutarak branş testi çözümü (Hız kazanma)"),
        ("5. Gün - Cuma", "Yapılamayan soruların çözümlerini inceleme ve tekrar"),
        ("6. Gün - Cumartesi", "50 soru karışık soru bankası taraması"),
        ("7. Gün - Pazar", "Yeni genel deneme sınavı ile ilerleme kontrolü"),
    ]

    action_plan = [
        {"day": i + 1, "day_name": d[0], "focus": d[1].split("+")[0].strip(), "task": d[1]}
        for i, d in enumerate(days)
    ]

    evaluation = (
        f"{test_name} sınavında {total} soruda {correct} doğru, {wrong} yanlış ile {net} Net elde ettin. "
        f"Yapay zekâ hazırlık ve yeterlilik puanın 100 üzerinden {calculated_score}. "
        f"{'Özellikle yanlışların yoğunlaştığı derslerde konu tekrarlarına odaklanmalısın.' if wrong > 0 else 'Çok başarılı bir performans gösterdin!'}"
    )

    return {
        "readiness_score": calculated_score,
        "evaluation": evaluation,
        "critical_weaknesses": critical_weaknesses or [{"subject": "Genel", "topic": "Hız ve Dikkat", "reason": "Soru çözme hızını artır", "urgency": "Orta"}],
        "strengths": strengths or [{"subject": "Genel", "topic": "Temel Seviye", "praise": "Temel kavramlara hakimsin"}],
        "subject_scores": subject_scores or {"Genel": calculated_score},
        "action_plan_7days": action_plan,
        "strategic_advice": "Yanlış yaptığın soruların çözümlerini ders notundan mutlaka incele ve aynı soru tipinden en az 10 soru çöz.",
    }


# ============ ÖZGÜN SORU ÜRETİM MOTORU ============

SYSTEM_QUESTION_GEN = (
    "Sen Türkiye'nin en seçkin sınav soru hazırlama komisyonu üyesisin. "
    "Mevcut soru kalıplarının dışına çıkan, tamamen özgün, güncel ÖSYM kazanımlarına ve soru mantığına %100 uygun, "
    "5 şıklı (A, B, C, D, E) ve detaylı açıklamalı sorular hazırlarsın. "
    "YALNIZCA geçerli bir JSON dizisi (Array) döndür."
)

async def generate_custom_questions_ai(
    exam_name: str,
    subject_name: str,
    topic_name: str,
    subtopic_name: Optional[str] = None,
    count: int = 5,
    difficulty: str = "orta",
    style: str = "standard",
    custom_instructions: Optional[str] = None,
    existing_samples: List[str] = None
) -> List[Dict[str, Any]]:
    """Admin paneli için sınav, ders, konu ve alt konuya özel özgün soru üretir."""
    samples_text = ""
    if existing_samples:
        samples_text = "\n\n⚠️ MEVCUT SORU ÖRNEKLERİ (Bu kalıpların aynısını tekrar etme, tamamen farklı ve yeni sorular yaz):\n" + "\n".join(f"- {s[:150]}" for s in existing_samples[:5])

    subtopic_info = f" (Alt Konu / Odak: {subtopic_name})" if subtopic_name else ""
    custom_info = f"\n\nÖzel Talimat / Admin Notu: {custom_instructions}" if custom_instructions else ""

    style_desc = {
        "standard": "Standart ÖSYM tarzı çok adımlı ve kavrayıcı sorular",
        "new_generation": "Yeni nesil, beceri temelli, grafik/şekil betimlemeli veya günlük hayat senaryolu sorular",
        "conceptual": "Kavramsal derinliği ve kuralları sorgulayan, çeldiricisi yüksek sorular",
        "mix": "Karma (%30 Kolay, %40 Orta, %30 Yeni Nesil Zor)",
    }.get(style, "ÖSYM formatında sorular")

    prompt = (
        f"{exam_name} sınavı formatına %100 uygun, {subject_name} dersi '{topic_name}'{subtopic_info} konusu için "
        f"tam {count} adet YEPYENİ, DAHA ÖNCE SORULMAMIŞ, ÖZGÜN soru hazırla.\n\n"
        f"Hedef Zorluk: {difficulty}\n"
        f"Soru Stili: {style_desc}"
        f"{custom_info}"
        f"{samples_text}\n\n"
        f"ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON ARRAY OLARAK DÖNDÜR:\n"
        f"[\n"
        f"  {{\n"
        f"    \"question_text\": \"Soru kökü ve öncüller... (Matematik için Unicode semboller: ², ³, √, π, ≤, ±)\",\n"
        f"    \"option_a\": \"A şıkkı\",\n"
        f"    \"option_b\": \"B şıkkı\",\n"
        f"    \"option_c\": \"C şıkkı\",\n"
        f"    \"option_d\": \"D şıkkı\",\n"
        f"    \"option_e\": \"E şıkkı\",\n"
        f"    \"correct_answer\": \"A\",\n"
        f"    \"difficulty\": \"{difficulty if difficulty != 'mix' else 'orta'}\",\n"
        f"    \"explanation\": \"Adım adım detaylı çözüm ve püf noktası...\"\n"
        f"  }}\n"
        f"]"
    )

    raw_json = None

    # 1. Gemini
    if key_manager.pools.get("gemini"):
        try:
            raw_json = await _call_gemini_with_failover(prompt, system=SYSTEM_QUESTION_GEN, is_json=True)
        except Exception as ex:
            logger.warning(f"Question Gen: Gemini failover exhausted: {ex}")

    # 2. OpenAI
    if not raw_json and key_manager.pools.get("openai"):
        try:
            raw_json = await _call_openai_compatible_with_failover("openai", prompt, default_model="gpt-4o-mini", system=SYSTEM_QUESTION_GEN, is_json=True)
        except Exception as ex:
            logger.warning(f"Question Gen: OpenAI failover exhausted: {ex}")

    # 3. DeepSeek
    if not raw_json and key_manager.pools.get("deepseek"):
        try:
            raw_json = await _call_openai_compatible_with_failover("deepseek", prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=SYSTEM_QUESTION_GEN, is_json=True)
        except Exception as ex:
            logger.warning(f"Question Gen: DeepSeek failover exhausted: {ex}")

    if not raw_json:
        raise RuntimeError("Yapay zeka soru üretim sağlayıcılarına bağlanılamadı. Lütfen API anahtarlarınızı kontrol edin.")

    parsed = _clean_json_str(raw_json)
    if isinstance(parsed, dict):
        parsed = parsed.get("questions") or parsed.get("items") or list(parsed.values())[0]

    if not isinstance(parsed, list):
        raise ValueError("Yapay zeka geçerli bir soru listesi döndürmedi.")

    return parsed


