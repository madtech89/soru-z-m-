import os
import re
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple
import config

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
        self.active_tasks = 0

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

    def mark_rate_limited(self):
        self.status = "rate_limited"
        self.fail_count += 1
        
        if self.fail_count == 1:
            cd = config.COOLDOWN_429
        elif self.fail_count == 2:
            cd = config.COOLDOWN_429_SECOND
        else:
            cd = config.COOLDOWN_429_THIRD
            
        self.cooldown_until = time.time() + cd
        logger.warning(f"AI key [{self.provider} - {self.masked}] rate-limited. Cooldown: {cd}s (Fail count: {self.fail_count})")

    def mark_failed(self, is_auth_error: bool = False):
        if is_auth_error:
            self.status = "disabled"
            logger.error(f"AI key [{self.provider} - {self.masked}] DISABLED due to Auth Error (401/403).")
            return
            
        self.fail_count += 1
        if self.fail_count >= config.MAX_RETRIES:
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
            "openrouter": self._parse_keys(["OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"], "openrouter"),
            "mistral": self._parse_keys(["MISTRAL_API_KEYS", "MISTRAL_API_KEY"], "mistral"),
            "anthropic": self._parse_keys(["ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY", "CLAUDE_API_KEY"], "anthropic"),
        }
        total_keys = sum(len(k) for k in self.pools.values())
        logger.info(f"AI Key Manager initialized with {total_keys} total keys across {len(self.pools)} providers.")

    async def sync_from_db(self, session):
        """Sync active API keys from the MySQL database into memory pools."""
        try:
            import models as M
            from sqlalchemy import select
            res = await session.execute(select(M.ApiKey).where(M.ApiKey.is_active == True))
            db_keys = res.scalars().all()
            
            new_pools = {
                "gemini": self._parse_keys(["GEMINI_API_KEY", "GOOGLE_API_KEY"], "gemini"),
                "openai": self._parse_keys(["OPENAI_API_KEY"], "openai"),
                "anthropic": self._parse_keys(["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"], "anthropic"),
                "deepseek": self._parse_keys(["DEEPSEEK_API_KEY"], "deepseek"),
                "groq": self._parse_keys(["GROQ_API_KEY"], "groq"),
                "openrouter": self._parse_keys(["OPENROUTER_API_KEY"], "openrouter"),
                "mistral": self._parse_keys(["MISTRAL_API_KEY"], "mistral"),
            }
            
            for k in db_keys:
                prov = (k.provider or "gemini").lower().strip()
                if prov not in new_pools:
                    new_pools[prov] = []
                if not any(e.key == k.key_value for e in new_pools[prov]):
                    new_pools[prov].append(KeyEntry(k.key_value, prov))
            
            self.pools = new_pools
            total_keys = sum(len(k) for k in self.pools.values())
            logger.info(f"AI Key Manager synced from DB: total {total_keys} active keys.")
        except Exception as e:
            logger.warning(f"Could not sync AI keys from database: {e}")

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

    def get_active_key(self, provider: str) -> Optional[str]:
        entry = self.get_available_key(provider)
        return entry.key if entry else None

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
    
    def get_all_available_keys(self) -> List[KeyEntry]:
        """Tüm sağlayıcılardaki kullanılabilir (active) anahtarları düz liste döndürür."""
        available = []
        for entries in self.pools.values():
            for e in entries:
                if e.is_available():
                    available.append(e)
        return available

    async def acquire_any_key(self, max_wait: int = 30) -> KeyEntry:
        """En az meşgul olan anahtarı bulur. Hepsi meşgulse (örn >3 görev) bekler (Semaphore)."""
        import asyncio
        start = time.time()
        while time.time() - start < max_wait:
            keys = self.get_all_available_keys()
            if not keys:
                await asyncio.sleep(1)
                continue
            
            # En az task sayısına sahip olanı seç (Round-robin / Load Balancing)
            keys.sort(key=lambda k: k.active_tasks)
            best_key = keys[0]
            
            # Eğer anahtarın 3'ten fazla eşzamanlı isteği varsa biraz bekle ki 429 yemeyelim
            if best_key.active_tasks >= 3:
                await asyncio.sleep(1)
                continue
                
            best_key.active_tasks += 1
            return best_key
            
        raise RuntimeError(f"Yapay zeka sistemi şu an çok yoğun. (Bekleme limiti {max_wait} sn aşıldı).")

    def release_key(self, entry: KeyEntry):
        if entry and entry.active_tasks > 0:
            entry.active_tasks -= 1

# Global Singleton Key Manager
key_manager = MultiAIKeyManager()


async def generate_chat_reply(user_message: str, history: List[Dict[str, str]] = None, user_name: str = "Öğrenci") -> str:
    """Generate conversational AI assistant reply with multi-key load balancing (Round-Robin)."""
    prompt = f"Öğrenci ({user_name}): {user_message}"

    try:
        # 1. En az meşgul olan anahtarı al (veya kuyrukta bekle)
        best_key = await key_manager.acquire_any_key(max_wait=30)
    except RuntimeError as ex:
        logger.warning(f"Chat load balancer failed: {ex}")
        return _generate_local_fallback({})

    try:
        # 2. Seçilen anahtarın provider tipine göre işlemi doğrudan O anahtar ile yap
        prov = best_key.provider
        if prov == "gemini":
            return await _call_gemini_with_failover(prompt, system=SYSTEM_CHAT, is_json=False, force_key=best_key)
        else:
            default_model = {
                "openai": "gpt-4o-mini",
                "deepseek": "deepseek-chat",
                "groq": "qwen/qwen3.6-27b",
                "openrouter": "google/gemini-3.6-flash"
            }.get(prov, "gpt-4o-mini")
            
            base_url = {
                "deepseek": "https://api.deepseek.com/v1",
                "groq": "https://api.groq.com/openai/v1",
                "openrouter": "https://openrouter.ai/api/v1"
            }.get(prov)

            return await _call_openai_compatible_with_failover(prov, prompt, default_model, base_url, system=SYSTEM_CHAT, is_json=False, force_key=best_key)
    except Exception as e:
        logger.error(f"Chat error with key {best_key.masked} ({best_key.provider}): {e}")
        return "Sistem şu an çok yoğun. Lütfen birkaç dakika sonra tekrar dene."
    finally:
        # 3. Anahtarı serbest bırak (Kuyruktaki diğerlerini bloklamamak için)
        key_manager.release_key(best_key)


def _clean_json_str(text: str) -> Any:
    if not text:
        raise ValueError("Yapay zekadan boş yanıt geldi.")
    
    text = text.strip()
    
    # 1. If closed </think> tag exists, take whatever is after </think>
    if "</think>" in text:
        after_think = text.split("</think>")[-1].strip()
        if after_think:
            text = after_think

    # 2. Extract JSON Array [...]
    s_arr, e_arr = text.find("["), text.rfind("]")
    if s_arr != -1 and e_arr != -1 and e_arr > s_arr:
        candidate = text[s_arr:e_arr + 1]
        try:
            return json.loads(candidate, strict=False)
        except Exception:
            cand_cleaned = re.sub(r',\s*([\]}])', r'\1', candidate)
            try:
                return json.loads(cand_cleaned, strict=False)
            except Exception:
                pass

    # 3. Extract JSON Object {...}
    s_obj, e_obj = text.find("{"), text.rfind("}")
    if s_obj != -1 and e_obj != -1 and e_obj > s_obj:
        candidate = text[s_obj:e_obj + 1]
        try:
            return json.loads(candidate, strict=False)
        except Exception:
            cand_cleaned = re.sub(r',\s*([\]}])', r'\1', candidate)
            try:
                return json.loads(cand_cleaned, strict=False)
            except Exception:
                pass

    # 4. Strip markdown code block indicators
    if "```" in text:
        m = re.search(r'```(?:json)?\s*(.*?)\s*```', text, flags=re.DOTALL)
        if m:
            candidate = m.group(1).strip()
            try:
                return json.loads(candidate, strict=False)
            except Exception:
                pass

    # 5. Direct JSON load attempt
    try:
        return json.loads(text, strict=False)
    except Exception:
        pass

    raise ValueError(f"JSON parse hatası: {text[:200]}")


# ============ PROVIDER CALLERS WITH MULTI-KEY FAILOVER ============

async def _call_gemini_with_failover(prompt: str, system: str = SYSTEM_COACH, is_json: bool = True, force_key: Optional[KeyEntry] = None) -> str:
    gemini_entries = [force_key] if force_key else [e for e in key_manager.pools.get("gemini", []) if e.is_available()]
    if not gemini_entries:
        raise RuntimeError("Kullanılabilir Gemini API anahtarı bulunamadı.")

    last_error = None
    default_model = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
    models_to_try = [default_model, "gemini-2.5-flash", "gemini-1.5-flash"]
    models_to_try = list(dict.fromkeys(models_to_try))

    import httpx

    for entry in gemini_entries:
        for model_name in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={entry.key}"
                full_prompt = f"{system}\n\n{prompt}" if system else prompt
                payload = {
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature": 0.7,
                    }
                }
                if is_json:
                    payload["generationConfig"]["responseMimeType"] = "application/json"

                async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as http_client:
                    r = await http_client.post(url, json=payload)
                    
                    if r.status_code == 200:
                        data = r.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            text = candidates[0]["content"]["parts"][0].get("text", "")
                            if text:
                                entry.mark_success()
                                return text
                    elif r.status_code == 429:
                        entry.mark_rate_limited()
                        if force_key:
                            raise httpx.HTTPStatusError("Rate limited", request=r.request, response=r)
                        break
                    elif r.status_code in [401, 403]:
                        entry.mark_failed(is_auth_error=True)
                        if force_key:
                            raise httpx.HTTPStatusError("Auth error", request=r.request, response=r)
                        break
                    
                    r.raise_for_status()

            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code == 429:
                    entry.mark_rate_limited()
                elif e.response.status_code in [401, 403]:
                    entry.mark_failed(is_auth_error=True)
                else:
                    entry.mark_failed(is_auth_error=False)
                if force_key:
                    raise e
                break 
            except Exception as ex:
                last_error = ex
                entry.mark_failed()
                if force_key:
                    raise ex
                break

        entry.mark_failed()

    raise RuntimeError(f"Gemini API yanıt vermedi. Son hata: {last_error}")


async def _call_openai_compatible_with_failover(provider_name: str, prompt: str, default_model: str, base_url: str = None, system: str = SYSTEM_COACH, is_json: bool = True, force_key: Optional[KeyEntry] = None) -> str:
    entries = [force_key] if force_key else [e for e in key_manager.pools.get(provider_name, []) if e.is_available()]
    if not entries:
        raise RuntimeError(f"Kullanılabilir {provider_name.capitalize()} API anahtarı bulunamadı.")

    from openai import AsyncOpenAI

    models_to_try = [os.environ.get(f"{provider_name.upper()}_MODEL", default_model)]
    if provider_name == "groq":
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    elif provider_name == "openrouter":
        models_to_try = ["nvidia/nemotron-3.5-lightning:free", "liquid/lfm-2.5-2.6b:free", "z-ai/glm-5.2:free"]
    models_to_try = list(dict.fromkeys(models_to_try))

    last_error = None
    for entry in entries:
        for model_name in models_to_try:
            try:
                kwargs = {"api_key": entry.key}
                if base_url:
                    kwargs["base_url"] = base_url
                client = AsyncOpenAI(**kwargs)

                call_kwargs = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000,
                }
                if is_json and "gpt" in model_name:
                    call_kwargs["response_format"] = {"type": "json_object"}

                response = await client.chat.completions.create(**call_kwargs, timeout=config.REQUEST_TIMEOUT)
                msg_obj = response.choices[0].message
                content = (msg_obj.content or "").strip()
                if not content and hasattr(msg_obj, "reasoning") and msg_obj.reasoning:
                    content = msg_obj.reasoning.strip()
                
                if content:
                    entry.mark_success()
                    return content
            except Exception as ex:
                last_error = ex
                err_str = str(ex).lower()
                status_code = getattr(ex, 'status_code', 200)
                
                if "429" in err_str or "rate limit" in err_str or "quota" in err_str or status_code == 429:
                    entry.mark_rate_limited()
                    # Try next model or next key
                    continue
                elif "401" in err_str or "403" in err_str or "invalid_api_key" in err_str or "unauthorized" in err_str or status_code in [401, 403]:
                    entry.mark_failed(is_auth_error=True)
                    break
                else:
                    continue
                    
        entry.mark_failed(is_auth_error=False)

    raise last_error or RuntimeError(f"All {provider_name} keys and models failed")


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

    # 5. OpenRouter (Free & Multi-model)
    if key_manager.pools.get("openrouter"):
        try:
            return await _call_openai_compatible_with_failover("openrouter", prompt, base_url="https://openrouter.ai/api/v1", default_model="nvidia/nemotron-3.5-lightning:free", system=system, is_json=is_json)
        except Exception as ex:
            logger.warning(f"OpenRouter failover exhausted: {ex}")

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
            raw_json = await _call_openai_compatible_with_failover("groq", prompt, base_url="https://api.groq.com/openai/v1", default_model="qwen/qwen3.6-27b", system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"Groq multi-key failover exhausted: {ex}")

    # 5. Try OpenRouter Keys (if available)
    if key_manager.pools.get("openrouter"):
        try:
            raw_json = await _call_openai_compatible_with_failover("openrouter", prompt, base_url="https://openrouter.ai/api/v1", default_model="google/gemini-3.6-flash", system=SYSTEM_COACH, is_json=True)
            return _clean_json_str(raw_json)
        except Exception as ex:
            logger.warning(f"OpenRouter multi-key failover exhausted: {ex}")

    # 6. Smart Local Engine Fallback (Zero-Downtime Guarantee)
    logger.info("Using built-in intelligent coach generator fallback.")
    return _generate_local_fallback(context)




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
            raw_json = await _call_openai_compatible_with_failover("groq", user_prompt, base_url="https://api.groq.com/openai/v1", default_model="qwen/qwen3.6-27b", system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"Groq exam diagnosis failover exhausted: {ex}")

    # 5. Try OpenRouter
    if key_manager.pools.get("openrouter"):
        try:
            raw_json = await _call_openai_compatible_with_failover("openrouter", user_prompt, base_url="https://openrouter.ai/api/v1", default_model="google/gemini-3.6-flash", system=SYSTEM_EXAM_ANALYSIS, is_json=True)
            res = _clean_json_str(raw_json)
            if "readiness_score" in res:
                return res
        except Exception as ex:
            logger.warning(f"OpenRouter exam diagnosis failover exhausted: {ex}")

    # 6. Local intelligent diagnostic fallback
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
    "Çözüm (explanation) alanını çok detaylı ve öğretici hazırla. Temel seviyedeki bir öğrencinin bile anlayabileceği kadar sade bir dil kullan. İşlemleri atlamadan, adım adım ve tane tane göster. "
    "Çözümün en sonuna MUTLAKA '💡 HAP BİLGİ:' ekleyerek konunun en can alıcı kuralını, pratik yolunu veya formülünü **kalın (bold)** fontla paylaş. "
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
    existing_samples: List[str] = None,
    force_key: Optional[KeyEntry] = None
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

    if force_key:
        prov = force_key.provider
        try:
            if prov == "gemini":
                raw_json = await _call_gemini_with_failover(prompt, system=SYSTEM_QUESTION_GEN, is_json=True, force_key=force_key)
            else:
                default_model = {
                    "openai": "gpt-4o-mini",
                    "deepseek": "deepseek-chat",
                    "groq": "openai/gpt-oss-120b",
                    "openrouter": "nvidia/nemotron-3.5-lightning:free"
                }.get(prov, "gpt-4o-mini")
                
                base_url = {
                    "deepseek": "https://api.deepseek.com/v1",
                    "groq": "https://api.groq.com/openai/v1",
                    "openrouter": "https://openrouter.ai/api/v1"
                }.get(prov)
                raw_json = await _call_openai_compatible_with_failover(prov, prompt, default_model, base_url, system=SYSTEM_QUESTION_GEN, is_json=True, force_key=force_key)
        except Exception as ex:
            logger.warning(f"Question Gen (Forced Key {force_key.masked}): failed: {ex}")
    else:
        # Load balance across all available active providers (Gemini, Groq, OpenRouter, OpenAI, DeepSeek)
        import random
        providers_order = ["gemini", "groq", "openrouter", "openai", "deepseek"]
        active_providers = [p for p in providers_order if key_manager.pools.get(p) and any(e.is_available() for e in key_manager.pools[p])]
        random.shuffle(active_providers)
        ordered_providers = active_providers + [p for p in providers_order if p not in active_providers and key_manager.pools.get(p)]

        for prov in ordered_providers:
            if raw_json:
                break
            try:
                if prov == "gemini":
                    raw_json = await _call_gemini_with_failover(prompt, system=SYSTEM_QUESTION_GEN, is_json=True)
                elif prov == "groq":
                    raw_json = await _call_openai_compatible_with_failover("groq", prompt, base_url="https://api.groq.com/openai/v1", default_model="openai/gpt-oss-120b", system=SYSTEM_QUESTION_GEN, is_json=True)
                elif prov == "openrouter":
                    raw_json = await _call_openai_compatible_with_failover("openrouter", prompt, base_url="https://openrouter.ai/api/v1", default_model="nvidia/nemotron-3.5-lightning:free", system=SYSTEM_QUESTION_GEN, is_json=True)
                elif prov == "openai":
                    raw_json = await _call_openai_compatible_with_failover("openai", prompt, default_model="gpt-4o-mini", system=SYSTEM_QUESTION_GEN, is_json=True)
                elif prov == "deepseek":
                    raw_json = await _call_openai_compatible_with_failover("deepseek", prompt, base_url="https://api.deepseek.com/v1", default_model="deepseek-chat", system=SYSTEM_QUESTION_GEN, is_json=True)
            except Exception as ex:
                logger.warning(f"Question Gen: {prov.upper()} provider attempt exhausted: {ex}")

    if not raw_json:
        raise RuntimeError("Yapay zeka soru üretim sağlayıcılarına bağlanılamadı. Lütfen API anahtarlarınızı kontrol edin.")

    parsed = _clean_json_str(raw_json)
    return validate_and_heal_questions(parsed, default_difficulty=difficulty)


def validate_and_heal_questions(parsed: Any, default_difficulty: str = "medium") -> List[Dict]:
    """
    Enterprise Output Validator & Auto-Healer:
    Validates, repairs, and standardizes AI-generated question arrays.
    Handles option dictionaries, missing keys, casing discrepancies, and explanations.
    """
    if isinstance(parsed, dict):
        if any(k in parsed for k in ["question_text", "option_a", "soru", "question", "text"]):
            parsed = [parsed]
        else:
            found_list = None
            for key in ["questions", "items", "data", "sorular", "results", "questions_list"]:
                if key in parsed and isinstance(parsed[key], list):
                    found_list = parsed[key]
                    break
            if found_list is None:
                for val in parsed.values():
                    if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                        found_list = val
                        break
            parsed = found_list if found_list is not None else [parsed]

    if not isinstance(parsed, list):
        raise ValueError("Yapay zeka geçerli bir soru listesi (JSON Array) döndürmedi.")

    validated = []
    for item in parsed:
        if not isinstance(item, dict):
            continue

        # 1. Question Text
        q_text = (
            item.get("question_text")
            or item.get("question")
            or item.get("soru")
            or item.get("text")
            or ""
        ).strip()

        if not q_text or len(q_text) < 10:
            continue

        # 2. Options Extraction & Normalization
        options_dict = item.get("options")
        if isinstance(options_dict, dict):
            opt_a = options_dict.get("A") or options_dict.get("a") or ""
            opt_b = options_dict.get("B") or options_dict.get("b") or ""
            opt_c = options_dict.get("C") or options_dict.get("c") or ""
            opt_d = options_dict.get("D") or options_dict.get("d") or ""
            opt_e = options_dict.get("E") or options_dict.get("e") or ""
        elif isinstance(options_dict, list) and len(options_dict) >= 4:
            opt_a = str(options_dict[0])
            opt_b = str(options_dict[1])
            opt_c = str(options_dict[2])
            opt_d = str(options_dict[3])
            opt_e = str(options_dict[4]) if len(options_dict) > 4 else ""
        else:
            opt_a = item.get("option_a") or item.get("A") or item.get("a") or ""
            opt_b = item.get("option_b") or item.get("B") or item.get("b") or ""
            opt_c = item.get("option_c") or item.get("C") or item.get("c") or ""
            opt_d = item.get("option_d") or item.get("D") or item.get("d") or ""
            opt_e = item.get("option_e") or item.get("E") or item.get("e") or ""

        # Clean option prefixes like "A) " or "B. "
        def _clean_opt(txt: Any) -> str:
            if not txt:
                return ""
            s = str(txt).strip()
            s = re.sub(r'^[A-Ea-e][\)\.\:\-]\s*', '', s).strip()
            return s

        opt_a = _clean_opt(opt_a)
        opt_b = _clean_opt(opt_b)
        opt_c = _clean_opt(opt_c)
        opt_d = _clean_opt(opt_d)
        opt_e = _clean_opt(opt_e)

        if not (opt_a and opt_b and opt_c and opt_d):
            continue  # Must have at least 4 options

        # 3. Correct Answer Normalization
        raw_ans = str(item.get("correct_answer") or item.get("answer") or item.get("dogru_cevap") or "A").strip()
        # Find first valid letter A-E
        ans_match = re.search(r'[A-Ea-e]', raw_ans)
        correct_letter = ans_match.group(0).upper() if ans_match else "A"

        # 4. Explanation & Solution
        explanation = (
            item.get("explanation")
            or item.get("solution")
            or item.get("cozum")
            or item.get("aciklama")
            or f"Doğru cevap {correct_letter} seçeneğidir."
        ).strip()

        # 5. Tags & Difficulty
        tags = item.get("tags") if isinstance(item.get("tags"), list) else []
        diff = item.get("difficulty") or default_difficulty

        validated.append({
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "option_e": opt_e,
            "correct_answer": correct_letter,
            "difficulty": diff,
            "explanation": explanation,
            "tags": tags,
        })

    if not validated:
        raise ValueError("Yapay zekanın döndürdüğü JSON içerisinde geçerli soru formatı bulunamadı.")

    return validated


async def audit_single_api_key(provider: str, key_val: str, key_id: str = None) -> Dict[str, Any]:
    """
    Comprehensive API Key Audit & Capabilities Inspector.
    Tests key across Question Generation, Student Coach Chat, and Blog Writer.
    """
    test_entry = KeyEntry(key=key_val, provider=provider)
    results = {
        "key_id": key_id,
        "provider": provider,
        "masked": test_entry.masked,
        "is_healthy": False,
        "latency_ms": 0,
        "capabilities": {
            "question_gen": False,
            "coach_chat": False,
            "blog_writer": False,
        },
        "tested_model": "",
        "error": None
    }

    t0 = time.time()
    try:
        # Test 1: Chat capability
        if provider == "gemini":
            results["tested_model"] = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
            chat_reply = await _call_gemini_with_failover("Merhaba, sadece 'TAMAM' yaz.", system="Kısa cevap ver.", is_json=False, force_key=test_entry)
        else:
            default_mod = {
                "groq": "openai/gpt-oss-120b",
                "openrouter": "google/gemini-2.0-flash-001",
                "deepseek": "deepseek-chat",
                "openai": "gpt-4o-mini"
            }.get(provider, "gpt-4o-mini")
            results["tested_model"] = default_mod
            base_url = {
                "deepseek": "https://api.deepseek.com/v1",
                "groq": "https://api.groq.com/openai/v1",
                "openrouter": "https://openrouter.ai/api/v1"
            }.get(provider)
            chat_reply = await _call_openai_compatible_with_failover(provider, "Merhaba, sadece 'TAMAM' yaz.", default_mod, base_url, system="Kısa cevap ver.", is_json=False, force_key=test_entry)

        if chat_reply:
            results["capabilities"]["coach_chat"] = True
            results["capabilities"]["blog_writer"] = True

        # Test 2: Structured JSON Question capability
        test_q_prompt = '{"exam":"TEST","topic":"TEST"} için 1 adet soru üret: [{"question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","option_e":"...","correct_answer":"A","explanation":"..."}]'
        if provider == "gemini":
            json_reply = await _call_gemini_with_failover(test_q_prompt, system=SYSTEM_QUESTION_GEN, is_json=True, force_key=test_entry)
        else:
            json_reply = await _call_openai_compatible_with_failover(provider, test_q_prompt, default_mod, base_url, system=SYSTEM_QUESTION_GEN, is_json=True, force_key=test_entry)

        cleaned = _clean_json_str(json_reply)
        validated = validate_and_heal_questions(cleaned)
        if len(validated) > 0:
            results["capabilities"]["question_gen"] = True

        results["is_healthy"] = True
    except Exception as ex:
        results["error"] = str(ex)
    finally:
        results["latency_ms"] = int((time.time() - t0) * 1000)

    return results


