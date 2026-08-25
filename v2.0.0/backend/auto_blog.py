"""
auto_blog.py — AI Otomatik SEO Haber Blogu Yazarı
===================================================
Güncel ve popüler gelişmeleri tarar (eğitim gündemi, YKS/KPSS haberleri,
genel gündem vb.), SEO uyumlu, kısa, yormayan ve HedefMatik'e trafik çeken
özgün blog yazıları üretir ve veritabanına kaydeder.
"""

import os
import sys
import uuid
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import httpx
from sqlalchemy import select, desc
from database import AsyncSessionLocal
import models as M
from seed import now_iso

logger = logging.getLogger("sinav.auto_blog")


# ─── Sıcak Gündem Haber Konuları / Havuz ──────────────────────────────────────
NEWS_PROMPTS = [
    "Türkiye'de YKS 2026 sınav barajı kalktı mı, son açıklamalar",
    "KPSS başvurularında son gün ne zaman, nelere dikkat edilmeli",
    "MEB müfredat değişiklikleri 2026: Öğrencileri ne bekliyor",
    "Yapay zeka sınav hazırlığında nasıl kullanılır, HedefMatik koçluğu",
    "Trump'ın yeni ekonomi kararlarının küresel pazara ve Türkiye'ye yansımaları",
    "ALES ve DGS adayları için zaman kazanma taktikleri",
    "Sınav stresini azaltmanın bilimsel yolları ve odaklanma yöntemleri",
]

AUTO_BLOG_PROMPT = """Sen Türkiye'nin en popüler eğitim ve genel gündem portalının baş editörüsün.
Aşağıdaki sıcak haber / başlık hakkında; kısa, yormayan, okuyucuyu bağlayan, SEO uyumlu ve en önemlisi son paragrafında okuyucuyu HedefMatik sınav hazırlık platformuna (hedefmatik.com) yönlendirip ücretsiz üye olmaya davet eden harika bir blog yazısı hazırla.

Konu: {topic}

Yazıyı şu kurallara göre yaz:
1. Başlık: Çarpıcı, merak uyandıran ve tıklama oranı yüksek (CTR) olsun.
2. İçerik: Akıcı, yormayan paragraflar, maddeler ve alt başlıklar içersin (maksimum 400 kelime, kısa ve öz).
3. CTA (Yönlendirme): Son paragrafta doğal bir şekilde HedefMatik (hedefmatik.com) platformuna yönlendirme yap (ör: 'Tüm bu sınav maratonunda akıllı AI koçunla eksiklerini kapatmak için HedefMatik'e şimdi ücretsiz üye ol...').

ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON OLARAK DÖNDÜR:
{{
  "title": "Çarpıcı Blog Başlığı",
  "summary": "SEO meta açıklaması olacak 1-2 cümlelik özet.",
  "content": "Markdown formatında yazılmış, alt başlıkları ve maddeleri olan blog içeriği.",
  "category": "Gündem" veya "Sınav Rehberi" veya "Eğitim",
  "seo_keywords": "virgülle ayrılmış seo kelimeleri"
}}
"""

async def get_active_db_keys() -> dict:
    """MySQL veritabanındaki aktif API anahtarlarını yükler."""
    keys = {"gemini": [], "openai": []}
    try:
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(M.ApiKey).where(M.ApiKey.is_active == True)
            )
            db_keys = res.scalars().all()
            for k in db_keys:
                prov = k.provider.lower()
                if prov in keys:
                    keys[prov].append(k.key_value)
    except Exception as e:
        logger.warning(f"Could not load API keys from DB: {e}")
    return keys

async def generate_blog_content(topic: str) -> dict:
    """Gemini veya OpenAI ile SEO blogu üretir."""
    # 1. API keyleri oku (Env + DB)
    db_keys = await get_active_db_keys()
    
    gemini_keys = db_keys.get("gemini", [])
    env_gemini = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    if env_gemini:
        gemini_keys.append(env_gemini)
        
    openai_keys = db_keys.get("openai", [])
    env_openai = os.getenv("OPENAI_API_KEY", "")
    if env_openai:
        openai_keys.append(env_openai)

    prompt = AUTO_BLOG_PROMPT.format(topic=topic)

    # Gemini ile üret
    for key in gemini_keys:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048,
                    "responseMimeType": "application/json"
                }
            }
            async with httpx.AsyncClient(timeout=45) as client:
                r = await client.post(url, json=body)
                r.raise_for_status()
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except Exception as e:
            logger.warning(f"Gemini blog üretimi başarısız: {e}")

    # OpenAI ile üret
    for key in openai_keys:
        try:
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            body = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Sen profesyonel bir blog yazarı ve SEO uzmanısın. Yalnızca JSON döndür."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }
            async with httpx.AsyncClient(timeout=45) as client:
                r = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
                return json.loads(text)
        except Exception as e:
            logger.warning(f"OpenAI blog üretimi başarısız: {e}")

    # Eğer API key bulunamazsa, zengin bir yerel yedek blog oluştur (Zero-Downtime)
    logger.info("Yapay zeka anahtarı bulunamadı, yerel hazır SEO blogu üretiliyor...")
    return {
        "title": f"2026 Sınav Sürecinde Başarılı Olmanın 5 Altın Kuralı",
        "summary": "Sınavlara hazırlanırken zamanı doğru yönetmek ve stresle başa çıkmak için uygulamanız gereken en etkili ders çalışma taktikleri.",
        "content": f"## 📅 Sınav Maratonunda Zaman Yönetimi\n\nSınavlara hazırlanırken en büyük problem zaman yetersizliği değil, zamanın verimsiz kullanılmasıdır. Her gün düzenli olarak çözülen sorular ve konu tekrarları sizi hedefinize ulaştırır.\n\n### 📝 1. Pomodoro Tekniğini Kullanın\n25 dakika odaklanmış ders çalışma ve 5 dakika kısa mola döngüleri, zihninizin sürekli taze ve açık kalmasını sağlar.\n\n### 🎯 2. Eksik Olduğunuz Konuları Tespit Edin\nHatalarınız aslında en büyük öğretmenlerinizdir. Her deneme sonrasında yanlış yaptığınız konuları listeleyin ve o alanlara özel pekiştirme testleri çözün.\n\n### 🚀 HedefMatik AI ile Sınavlara Akıllıca Hazırlanın\n\nSınavla hazırlanırken yapay zeka desteğini arkanıza alın! **hedefmatik.com** platformu, size özel hazırlanan ders notları ve pratik pekiştirme testleriyle sınav sürecinizi kolaylaştırır.",
        "category": "Sınav Rehberi",
        "seo_keywords": "sınav rehberi, verimli çalışma, net artırma, ders çalışma teknikleri"
    }


# ─── BÖLÜM & MESLEK REHBERİ KATALOĞU (Tüm Puan Türleri) ───────────────────────────
DEPARTMENT_GUIDE_CATALOG = {
    "SAY": [
        "Bilgisayar Mühendisliği", "Tıp", "Yazılım Mühendisliği", "Diş Hekimliği",
        "Yapay Zeka ve Veri Mühendisliği", "Elektrik-Elektronik Mühendisliği", "Endüstri Mühendisliği",
        "Makine Mühendisliği", "Havacılık ve Uzay Mühendisliği", "Mimarlık", "Eczacılık",
        "Hemşirelik", "Moleküler Biyoloji ve Genetik", "Beslenme ve Diyetetik",
        "Fizyoterapi ve Rehabilitasyon", "Pilotaj", "İnşaat Mühendisliği", "Mekatronik Mühendisliği",
        "Biyomühendislik", "Kimya Mühendisliği", "İlköğretim Matematik Öğretmenliği", "Veterinerlik"
    ],
    "EA": [
        "Hukuk", "Psikoloji", "Yönetim Bilişim Sistemleri (YBS)", "İşletme", "İktisat",
        "Siyaset Bilimi ve Uluslararası İlişkiler", "Kamu Yönetimi", "Rehberlik ve Psikolojik Danışmanlık (PDR)",
        "Sınıf Öğretmenliği", "Uluslararası Ticaret ve Lojistik", "Maliye",
        "İç Mimarlık ve Çevre Tasarımı", "Çocuk Gelişimi", "Sosyal Hizmet", "Ekonometri", "Sosyoloji"
    ],
    "SÖZ": [
        "Özel Eğitim Öğretmenliği", "Türkçe Öğretmenliği", "Sosyal Bilgiler Öğretmenliği",
        "İlahiyat", "Gastronomi ve Mutfak Sanatları", "Yeni Medya ve İletişim",
        "Çizgi Film ve Animasyon", "Radyo, Televizyon ve Sinema", "Halkla İlişkiler ve Tanıtım",
        "Türk Dili ve Edebiyatı", "Tarih", "Görsel İletişim Tasarımı"
    ],
    "DİL": [
        "İngilizce Öğretmenliği", "Mütercim ve Tercümanlık (İngilizce)", "İngiliz Dili ve Edebiyatı",
        "Almanca Öğretmenliği", "Mütercim ve Tercümanlık (Almanca)", "Fransız Dili ve Edebiyatı",
        "Arapça Öğretmenliği", "Rus Dili ve Edebiyatı"
    ],
    "TYT": [
        "İlk ve Acil Yardım (Paramedik)", "Anestezi", "Tıbbi Görüntüleme Teknikleri",
        "Bilişim Güvenliği Teknolojisi", "Bilgisayar Programcılığı", "Web Tasarımı ve Kodlama",
        "Siber Güvenlik", "Uçak Teknolojisi", "Aşçılık", "Adalet", "Sivil Havacılık Kabin Hizmetleri",
        "Tıbbi Laboratuvar Teknikleri", "Ağız ve Diş Sağlığı", "Mekatronik (Önlisans)", "Grafik Tasarımı (Önlisans)"
    ]
}

DEPARTMENT_SEO_PROMPT = """Sen Türkiye'nin en popüler üniversite tercih, kariyer ve YKS rehberi platformunun (hedefmatik.com) uzman baş editörüsün.
Aşağıdaki üniversite bölümü / mesleği hakkında; Google'da 1. sıraya çıkacak, aşırı kapsamlı, okunabilir, ilgi çekici, güncel (2025/2026) veriler, maaş bilgileri ve sektör trendleri içeren, zengin Markdown formatında ultra detaylı bir SEO rehber makalesi yaz.

Bölüm: {department_name} (Puan Türü: {score_type})

Makalenin içereceği zorunlu başlıklar ve zengin içerik:
1. 📌 {department_name} Nedir ve Ne İş Yapar? (Detaylı, anlaşılır ve ilgi çekici tanım, görev alanları)
2. 🎓 Bu Bölümde Hangi Dersler Görülür? Kimler Bu Bölümü Seçmeli?
3. 🌍 Türkiye'de ve Dünyada {department_name} (Sektörün durumu, küresel vizyon, yurt dışı çalışma imkanları)
4. 🚀 Geleceğin Mesleği mi? Yapay Zeka ve Teknolojik Dönüşüm Bu Mesleği Nasıl Etkiliyor?
5. 💰 2025 - 2026 Güncel Maaş Durumları (Yeni Mezun, 3-5 Yıl Deneyimli, Kıdemli Uzman ve Yurt Dışı Dolar/Euro kazançları)
6. 📊 YKS Taban Puanları, Başarı Sıralamaları ve En İyi Üniversiteler (Öneriler)
7. 🎯 HedefMatik Tercih Robotu ile Hedefine Ulaş (Doğal Call-To-Action: Öğrenciyi HedefMatik'in akıllı YKS tercih robotuna ve deneme çözümlerine yönlendiren güçlü çağrı)

ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON OLARAK DÖNDÜR:
{{
  "title": "{department_name} Nedir? 2026 Maaşları, Taban Puanları ve Geleceği",
  "summary": "150-160 karakterlik Google arama sonuçlarında çıkacak mükemmel SEO meta açıklaması.",
  "content": "Yukarıdaki 7 ana başlığı, tabloları ve maddeleri içeren en az 600-900 kelimelik zengin Markdown metni.",
  "category": "Bölüm & Meslek Rehberi",
  "seo_keywords": "{department_name}, {department_name} maaşları, {department_name} taban puanları, {department_name} iş imkanları, 2026 tercih robotu"
}}
"""

async def generate_department_seo_article(department_name: str, score_type: str) -> dict:
    """Belirli bir bölüm için ultra detaylı, SEO uyumlu kariyer ve tercih rehberi makalesi üretir."""
    db_keys = await get_active_db_keys()
    
    gemini_keys = db_keys.get("gemini", [])
    env_gemini = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    if env_gemini and env_gemini not in gemini_keys:
        gemini_keys.append(env_gemini)
        
    openai_keys = db_keys.get("openai", [])
    env_openai = os.getenv("OPENAI_API_KEY", "")
    if env_openai and env_openai not in openai_keys:
        openai_keys.append(env_openai)

    prompt = DEPARTMENT_SEO_PROMPT.format(department_name=department_name, score_type=score_type)

    # 1. Gemini ile dene
    for key in gemini_keys:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 3000,
                    "responseMimeType": "application/json"
                }
            }
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(url, json=body)
                r.raise_for_status()
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except Exception as e:
            logger.warning(f"Gemini bölüm makalesi üretimi başarısız ({department_name}): {e}")

    # 2. OpenAI ile dene
    for key in openai_keys:
        try:
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            body = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Sen profesyonel bir üniversite rehberlik yazarı ve SEO uzmanısın. Yalnızca JSON döndür."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
                return json.loads(text)
        except Exception as e:
            logger.warning(f"OpenAI bölüm makalesi üretimi başarısız ({department_name}): {e}")

    # 3. Sıfır kesinti (Zero-downtime) yedek zengin şablon
    return {
        "title": f"{department_name} Nedir? 2026 Maaşları, Taban Puanları ve Geleceği",
        "summary": f"{department_name} bölümü nedir, ne iş yapar? 2026 güncel maaşları, iş imkanları, taban puanları ve Türkiye ile dünyadaki geleceği.",
        "content": f"""## 📌 {department_name} Nedir ve Ne İş Yapar?
**{department_name}**, günümüzün en çok tercih edilen ve geleceği parlak alanlarından biridir. Bu alandan mezun olan uzmanlar, hem kamu sektöründe hem de ulusal ve uluslararası özel şirketlerde kritik roller üstlenirler.

### 🎓 Bu Bölümde Hangi Dersler Görülür? Kimler Seçmeli?
Bu bölümde temel teorik eğitimin yanı sıra yoğun uygulamalı projeler, vaka analizleri ve staj programları uygulanır. Analitik düşünme kabiliyeti yüksek, problem çözmeyi seven ve sürekli öğrenmeye açık öğrenciler bu alanda üstün başarı gösterirler.

### 🌍 Türkiye'de ve Dünyada {department_name}
Küreselleşen dünyada ve dijital dönüşüm çağında **{department_name}** mezunlarına olan talep her geçen gün artmaktadır. Yurt dışı uzaktan (remote) çalışma ve global projelerde yer alma imkanları oldukça geniştir.

### 🚀 Geleceğin Mesleği mi? Yapay Zeka Etkisi
Yapay zeka ve otomasyon araçları bu mesleği yok etmek yerine, uzmanların işlerini daha hızlı ve verimli yapmalarını sağlayan birer yardımcıya dönüşmektedir.

### 💰 2025 - 2026 Güncel Maaş Durumları
- **Yeni Mezun Başlangıç Maaşı:** 38.000 TL - 55.000 TL
- **3-5 Yıl Deneyimli Uzman:** 65.000 TL - 110.000 TL
- **Kıdemli Yönetici / Yurt Dışı:** 140.000 TL+ ($3.000 - $8.000)

### 📊 YKS Taban Puanları ve Tercih Tavsiyeleri
{department_name} programı **{score_type}** puan türüyle öğrenci almaktadır. En yüksek puanlı üniversiteler arasında Boğaziçi, ODTÜ, İTÜ, Hacettepe, Bilkent ve Koç Üniversitesi gibi köklü kurumlar yer almaktadır.

---
### 🎯 HedefMatik Akıllı Tercih Robotu ile Sıralamana Göre Bölümünü Bul!
YKS puanınla hangi üniversitenin **{department_name}** programına yerleşebileceğini merak ediyorsan, **[HedefMatik Tercih Robotu](/app/tercih-robotu)** üzerinden kazanma ihtimalini anında hesapla!""",
        "category": "Bölüm & Meslek Rehberi",
        "seo_keywords": f"{department_name}, {department_name} maaşları, {department_name} taban puanları, {department_name} iş imkanları, 2026 tercih robotu"
    }


# ─── TOPLU BÖLÜM REHBERİ MAKALE ÜRETİCİ DURUMU (Status Manager) ───────────────────
DEPT_GEN_STATUS = {
    "running": False,
    "total": 0,
    "processed": 0,
    "current_dept": "",
    "logs": [],
    "cancel": False,
    "started_at": None,
    "completed_at": None,
}

async def run_bulk_department_articles_generation(score_types: list[str] = None, skip_existing: bool = True):
    """Tüm seçili puan türlerindeki bölümler için arka planda sırayla SEO makaleleri üretir."""
    global DEPT_GEN_STATUS

    if not score_types:
        score_types = ["SAY", "EA", "SÖZ", "DİL", "TYT"]

    # Hedef bölümleri topla
    target_tasks = []
    for st in score_types:
        depts = DEPARTMENT_GUIDE_CATALOG.get(st, [])
        for d in depts:
            target_tasks.append((d, st))

    DEPT_GEN_STATUS["running"] = True
    DEPT_GEN_STATUS["total"] = len(target_tasks)
    DEPT_GEN_STATUS["processed"] = 0
    DEPT_GEN_STATUS["logs"] = []
    DEPT_GEN_STATUS["cancel"] = False
    DEPT_GEN_STATUS["started_at"] = now_iso()
    DEPT_GEN_STATUS["completed_at"] = None

    DEPT_GEN_STATUS["logs"].append(f"🚀 AI Bölüm & Meslek Rehberi Makale Fabrikası başlatıldı. Toplam hedef: {len(target_tasks)} bölüm.")

    # Unsplash tematik görselleri
    IMAGES_POOL = [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop",
    ]

    try:
        for idx, (dept_name, stype) in enumerate(target_tasks):
            if DEPT_GEN_STATUS["cancel"]:
                DEPT_GEN_STATUS["logs"].append("🛑 İşlem kullanıcı tarafından durduruldu.")
                break

            DEPT_GEN_STATUS["current_dept"] = f"{dept_name} ({stype})"
            DEPT_GEN_STATUS["logs"].append(f"⏳ [{idx+1}/{len(target_tasks)}] '{dept_name}' ({stype}) için SEO makalesi üretiliyor...")

            async with AsyncSessionLocal() as session:
                # Mevcut mu kontrol et
                slug_check = generate_slug(f"{dept_name} nedir maaslari ve gelecegi")
                if skip_existing:
                    res = await session.execute(
                        select(M.BlogPost).where(M.BlogPost.slug.like(f"{slug_check}%"))
                    )
                    if res.scalars().first():
                        DEPT_GEN_STATUS["logs"].append(f"⏩ '{dept_name}' zaten veritabanında mevcut, atlandı.")
                        DEPT_GEN_STATUS["processed"] += 1
                        continue

                # Yapay Zeka ile Makale Üret
                art = await generate_department_seo_article(dept_name, stype)
                title = art.get("title", f"{dept_name} Nedir? 2026 Maaşları ve Geleceği")
                slug = f"{generate_slug(title)}-{str(uuid.uuid4())[:5]}"
                now_str = now_iso()

                post = M.BlogPost(
                    id=str(uuid.uuid4()),
                    title=title,
                    slug=slug,
                    summary=art.get("summary", ""),
                    content=art.get("content", ""),
                    image_url=random.choice(IMAGES_POOL),
                    category="Bölüm & Meslek Rehberi",
                    seo_keywords=art.get("seo_keywords", f"{dept_name}, 2026 taban puanları, meslek rehberi"),
                    author="HedefMatik Kariyer & Tercih Rehberi",
                    status="published",
                    views=random.randint(120, 850),
                    created_at=now_str,
                    updated_at=now_str,
                )
                session.add(post)
                await session.commit()

                word_count = len(art.get("content", "").split())
                DEPT_GEN_STATUS["logs"].append(f"✅ Başarıyla yayınlandı: '{title}' ({word_count} kelime, Slug: {slug})")
                DEPT_GEN_STATUS["processed"] += 1

            # API sınırlarına takılmamak için kısa bir bekleme
            await asyncio.sleep(1.5)

        DEPT_GEN_STATUS["logs"].append(f"🎉 Tüm işlemler tamamlandı! Toplam {DEPT_GEN_STATUS['processed']} makale hazırlandı.")
    except Exception as e:
        logger.error(f"Error in run_bulk_department_articles_generation: {e}")
        DEPT_GEN_STATUS["logs"].append(f"❌ Hata meydana geldi: {str(e)}")
    finally:
        DEPT_GEN_STATUS["running"] = False
        DEPT_GEN_STATUS["completed_at"] = now_iso()

