import os
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("sinav.ai")

SYSTEM_COACH = (
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
