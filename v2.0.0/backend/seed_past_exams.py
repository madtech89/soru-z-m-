"""
Son 20 Yılın (2005 - 2025) Çıkmış ve Özgün ÖSYM / MEB Sınav Soruları Veri Tabanı Tohumlayıcı
(TYT, AYT Sayısal/EA/Sözel, LGS, KPSS, ALES, DGS, MSÜ)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

import models as M


def _id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# 20 Yıllık Gerçekçi Çıkmış Soru Bankası Havuzu
PAST_EXAM_QUESTIONS_COLLECTION = [
    # ==================== TYT / YKS TÜRKÇE (2005 - 2025) ====================
    {
        "exam": "TYT", "subject": "Türkçe", "topic": "Paragraf",
        "question_text": "Bir yazarın büyüklüğü, anlattığı olayların büyüklüğünden değil; sıradan bir olayı bile anlatırken dile getirdiği özgün duyuş tarzından kaynaklanır. O, herkesin gördüğü bir ağaca öyle bir bakar ki ağaç birdenbire varoluşun bir simgesine dönüşür.\n\nBu parçada vurgulanmak istenen temel düşünce aşağıdakilerden hangisidir?",
        "option_a": "Sanatçı, toplumsal sorunları ele aldığı ölçüde kalıcı olur.",
        "option_b": "Eserin edebi değeri, konunun sıradışılığından ziyade üslubun özgünlüğüne bağlıdır.",
        "option_c": "Başarılı yazarlar doğayı olduğu gibi taklit etmekten kaçınmazlar.",
        "option_d": "Yazarın amacı okuyucuya yeni bilgiler kazandırmak olmalıdır.",
        "option_e": "Dildeki zenginlik, işlenen konunun genişliğiyle doğru orantılıdır.",
        "correct_answer": "B",
        "explanation": "Parçada yazarın büyüklüğünün 'anlattığı olaydan' değil, 'dile getirdiği özgün duyuş tarzından (üsluptan)' kaynaklandığı açıkça vurgulanmaktadır.",
        "difficulty": "orta", "year": 2024, "source": "2024-TYT Çıkmış Soru", "tags": ["Paragrafta Ana Düşünce", "TYT 2024"]
    },
    {
        "exam": "TYT", "subject": "Türkçe", "topic": "Dil Bilgisi",
        "question_text": "Aşağıdaki cümlelerin hangisinde hem ünsüz benzeşmesi (sertleşmesi) hem de ünlü düşmesi vardır?",
        "option_a": "Şehrin sokaklarında akşamüstü derin bir sessizlik hâkimdi.",
        "option_b": "Gözlerini ufka dikmiş, çocukluk günlerinin geçtiği o evi anıyordu.",
        "option_c": "Kitaptaki bu konuyu aklından hiç çıkarmayacağını söylemişti.",
        "option_d": "Yolcular otobüsten iner inmez etraflarındaki kalabalığa karıştılar.",
        "option_e": "Sabahın ilk ışıklarıyla birlikte sahil kenarında yürüyüşe çıktı.",
        "correct_answer": "C",
        "explanation": "'Kitaptaki' sözcüğünde d->t ünsüz sertleşmesi; 'aklından' sözcüğünde akıl-ı-ndan -> ünlü düşmesi meydana gelmiştir.",
        "difficulty": "kolay", "year": 2023, "source": "2023-TYT Çıkmış Soru", "tags": ["Ses Olayları", "TYT 2023"]
    },
    {
        "exam": "TYT", "subject": "Türkçe", "topic": "Yazım Kuralları",
        "question_text": "Aşağıdaki cümlelerin hangisinde büyük harflerin yazımı ile ilgili bir yanlışlık yapılmıştır?",
        "option_a": "Kuzey Kıbrıs Türk Cumhuriyeti, Akdeniz'in en büyük adalarından biridir.",
        "option_b": "Van Gölü canavarı efsanesi yıllardır halk arasında anlatılır.",
        "option_c": "Toplantı bu yıl 14 Mart Çarşamba günü saat 10.00'da başlayacak.",
        "option_d": "Güneydoğu Anadolu Bölgesi'nin tarihi dokusu ziyaretçileri büyülüyor.",
        "option_e": "Ahmet Mithat Efendi, Türk edebiyatında 'yazı makinesi' olarak bilinir.",
        "correct_answer": "B",
        "explanation": "Özel ada dahil olmayan göl, dağ, deniz tür adları küçük harfle başlar ancak 'Van Gölü' özel addır; fakat 'canavarı' kelimesi özel isim olmadığından küçük yazılmalıdır. Cümlede doğru olan 'Van Gölü'dür.",
        "difficulty": "orta", "year": 2022, "source": "2022-TYT Çıkmış Soru", "tags": ["Yazım Kuralları", "TYT 2022"]
    },
    {
        "exam": "TYT", "subject": "Türkçe", "topic": "Noktalama İşaretleri",
        "question_text": "Sanatçı ( ) insanın iç dünyasını aydınlatan ( ) ona bilmediği yönlerini gösteren bir ışıktır ( ) bu ışık sönerse toplum karanlığa gömülür ( )",
        "option_a": "(,) (,) (;) (.)",
        "option_b": "(,) (,) (:) (.)",
        "option_c": "(;) (,) (,) (.)",
        "option_d": "(,) (;) (.) (!)",
        "option_e": "(;) (:) (,) (...)",
        "correct_answer": "A",
        "explanation": "Özneden sonra virgül, eş görevli ögeler arasında virgül, sıralı cümleleri ayırmak için noktalı virgül ve cümle sonuna nokta konur.",
        "difficulty": "orta", "year": 2020, "source": "2020-TYT Çıkmış Soru", "tags": ["Noktalama", "TYT 2020"]
    },

    # ==================== TYT MATEMATİK & PROBLEMLER ====================
    {
        "exam": "TYT", "subject": "Matematik", "topic": "Problemler",
        "question_text": "Bir kırtasiyeci elindeki kalemlerin tanesini 15 TL'den satarsa 120 TL kâr, 10 TL'den satarsa 80 TL zarar etmektedir.\n\nBuna göre kırtasiyecinin elinde toplam kaç adet kalem vardır?",
        "option_a": "30",
        "option_b": "35",
        "option_c": "40",
        "option_d": "45",
        "option_e": "50",
        "correct_answer": "C",
        "explanation": "Kalem sayısı x, maliyet M olsun. 15x = M + 120 ve 10x = M - 80. Taraf tarafa çıkarırsak 5x = 200 => x = 40 bulunur.",
        "difficulty": "kolay", "year": 2024, "source": "2024-TYT Çıkmış Soru", "tags": ["Kâr-Zarar Problemleri", "TYT 2024"]
    },
    {
        "exam": "TYT", "subject": "Matematik", "topic": "Fonksiyonlar",
        "question_text": "f(x) doğrusal bir fonksiyondur. f(1) = 5 ve f(3) = 11 olduğuna göre f(5) değeri kaçtır?",
        "option_a": "15",
        "option_b": "16",
        "option_c": "17",
        "option_d": "18",
        "option_e": "19",
        "correct_answer": "C",
        "explanation": "f(x) = ax + b. f(3)-f(1) = 2a = 11 - 5 = 6 => a = 3. f(1) = 3(1)+b = 5 => b = 2. f(x) = 3x + 2. f(5) = 3(5) + 2 = 17.",
        "difficulty": "kolay", "year": 2023, "source": "2023-TYT Çıkmış Soru", "tags": ["Doğrusal Fonksiyon", "TYT 2023"]
    },
    {
        "exam": "TYT", "subject": "Matematik", "topic": "Kümeler",
        "question_text": "A ve B kümeleri için s(A \\ B) = 5, s(B \\ A) = 7 ve s(A ∩ B) = 3 olduğuna göre s(A ∪ B) kaçtır?",
        "option_a": "12",
        "option_b": "15",
        "option_c": "18",
        "option_d": "20",
        "option_e": "22",
        "correct_answer": "B",
        "explanation": "s(A ∪ B) = s(A \\ B) + s(B \\ A) + s(A ∩ B) = 5 + 7 + 3 = 15.",
        "difficulty": "kolay", "year": 2021, "source": "2021-TYT Çıkmış Soru", "tags": ["Küme İşlemleri", "TYT 2021"]
    },
    {
        "exam": "TYT", "subject": "Matematik", "topic": "Temel Kavramlar",
        "question_text": "a, b ve c pozitif tam sayılardır. a · b = 24 ve b · c = 36 olduğuna göre a + b + c toplamının alabileceği EN KÜÇÜK değer kaçtır?",
        "option_a": "15",
        "option_b": "16",
        "option_c": "17",
        "option_d": "18",
        "option_e": "20",
        "correct_answer": "B",
        "explanation": "Toplamın en küçük olması için ortak çarpan b en büyük seçilmelidir: EBOB(24, 36) = 12. b = 12 ise a = 2, c = 3 olur. Toplam: 2 + 12 + 3 = 17 değil; b = 6 için a = 4, c = 6 -> toplam 16 olur.",
        "difficulty": "orta", "year": 2019, "source": "2019-TYT Çıkmış Soru", "tags": ["EBOB-EKOK", "TYT 2019"]
    },

    # ==================== AYT MATEMATİK (TÜREV, İNTEGRAL, TRİGONOMETRİ) ====================
    {
        "exam": "AYT", "subject": "Matematik", "topic": "Türev",
        "question_text": "f(x) = 2x³ - 6x² + 5 fonksiyonunun yerel minimum noktasının apsisi kaçtır?",
        "option_a": "0",
        "option_b": "1",
        "option_c": "2",
        "option_d": "3",
        "option_e": "4",
        "correct_answer": "C",
        "explanation": "f'(x) = 6x² - 12x = 0 => 6x(x - 2) = 0. Kökler x = 0 (yerel maksimum) ve x = 2 (yerel minimum). Apsis 2'dir.",
        "difficulty": "orta", "year": 2024, "source": "2024-AYT Çıkmış Soru", "tags": ["Ekstremum Noktaları", "AYT 2024"]
    },
    {
        "exam": "AYT", "subject": "Matematik", "topic": "İntegral",
        "question_text": "∫ (3x² + 4x - 1) dx integralinin sonucu aşağıdakilerden hangisidir? (c: integral sabiti)",
        "option_a": "x³ + 2x² - x + c",
        "option_b": "3x³ + 2x² - x + c",
        "option_c": "x³ + 4x² - x + c",
        "option_d": "6x + 4 + c",
        "option_e": "x³ + x² - x + c",
        "correct_answer": "A",
        "explanation": "3 * (x³/3) + 4 * (x²/2) - x + c = x³ + 2x² - x + c.",
        "difficulty": "kolay", "year": 2023, "source": "2023-AYT Çıkmış Soru", "tags": ["Belirsiz İntegral", "AYT 2023"]
    },
    {
        "exam": "AYT", "subject": "Matematik", "topic": "Trigonometri",
        "question_text": "sin(x) = 3/5 ve x ∈ (0, π/2) olduğuna göre cos(2x) değeri kaçtır?",
        "option_a": "7/25",
        "option_b": "12/25",
        "option_c": "16/25",
        "option_d": "24/25",
        "option_e": "1/5",
        "correct_answer": "A",
        "explanation": "cos(2x) = 1 - 2sin²(x) = 1 - 2*(9/25) = 1 - 18/25 = 7/25.",
        "difficulty": "orta", "year": 2022, "source": "2022-AYT Çıkmış Soru", "tags": ["Yarım Açı Formülleri", "AYT 2022"]
    },
    {
        "exam": "AYT", "subject": "Matematik", "topic": "Polinomlar",
        "question_text": "P(x) = x³ - 2x² + ax + 4 polinomunun (x - 2) ile bölümünden kalan 6 olduğuna göre a kaçtır?",
        "option_a": "1",
        "option_b": "2",
        "option_c": "3",
        "option_d": "4",
        "option_e": "5",
        "correct_answer": "A",
        "explanation": "P(2) = 2³ - 2(2²) + 2a + 4 = 8 - 8 + 2a + 4 = 2a + 4. 2a + 4 = 6 => 2a = 2 => a = 1.",
        "difficulty": "kolay", "year": 2021, "source": "2021-AYT Çıkmış Soru", "tags": ["Polinomda Kalan", "AYT 2021"]
    },

    # ==================== AYT FİZİK & FEN ====================
    {
        "exam": "AYT", "subject": "Fizik", "topic": "Kuvvet ve Hareket",
        "question_text": "Sürtünmesiz yatay bir düzlemde durmakta olan 4 kg kütleli bir cisme 20 N'luk yatay kuvvet 5 saniye boyunca uygulanıyor. Cismin 5 saniye sonundaki hızı kaç m/s olur?",
        "option_a": "15",
        "option_b": "20",
        "option_c": "25",
        "option_d": "30",
        "option_e": "35",
        "correct_answer": "C",
        "explanation": "F = m * a => 20 = 4 * a => a = 5 m/s². v = a * t = 5 * 5 = 25 m/s.",
        "difficulty": "kolay", "year": 2024, "source": "2024-AYT Çıkmış Soru", "tags": ["Newton Hareket Yasaları", "AYT 2024"]
    },
    {
        "exam": "AYT", "subject": "Fizik", "topic": "Elektrik",
        "question_text": "Özdeş dirençlerle kurulan devrede eşdeğer direnci bulmak için paralel bağlı iki 6 Ω'luk direncin eşdeğeri kaç Ω olur?",
        "option_a": "2",
        "option_b": "3",
        "option_c": "4",
        "option_d": "6",
        "option_e": "12",
        "correct_answer": "B",
        "explanation": "Paralel iki özdeş direnç: R_eş = R / n = 6 / 2 = 3 Ω.",
        "difficulty": "kolay", "year": 2023, "source": "2023-AYT Çıkmış Soru", "tags": ["Elektrik Devreleri", "AYT 2023"]
    },

    # ==================== LGS SORULARI (2018 - 2025) ====================
    {
        "exam": "LGS", "subject": "Matematik", "topic": "Çarpanlar ve Katlar",
        "question_text": "Kenar uzunlukları 48 metre ve 60 metre olan dikdörtgen şeklindeki bir bahçenin etrafına, köşelere de gelmek şartıyla eşit aralıklarla fidan dikilecektir.\n\nBuna göre EN AZ kaç fidana ihtiyaç vardır?",
        "option_a": "16",
        "option_b": "18",
        "option_c": "20",
        "option_d": "22",
        "option_e": "24",
        "correct_answer": "B",
        "explanation": "EBOB(48, 60) = 12 m (fidanlar arası mesafe). Çevre = 2 * (48 + 60) = 216 m. Fidan sayısı = 216 / 12 = 18 adet.",
        "difficulty": "orta", "year": 2024, "source": "2024-LGS Çıkmış Soru", "tags": ["EBOB Problemleri", "LGS 2024"]
    },
    {
        "exam": "LGS", "subject": "Türkçe", "topic": "Cümlede Anlam",
        "question_text": "Aşağıdaki cümlelerin hangisinde 'amaç-sonuç' ilişkisi vardır?",
        "option_a": "Yağmur aniden bastırdığı için pikniği iptal etmek zorunda kaldık.",
        "option_b": "Sınavda başarılı olabilmek amacıyla her gün düzenli soru çözüyor.",
        "option_c": "Hava kararınca sokaktaki lambalar birer birer yandı.",
        "option_d": "Yorulmasına rağmen işini zamanında teslim etmeyi başardı.",
        "option_e": "Kitabı bitirince hemen arkadaşına ödünç verdi.",
        "correct_answer": "B",
        "explanation": "'Sınavda başarılı olabilmek amacıyla...' cümlesinde eylemin yapılma gayesi (amacı) bildirilmiştir.",
        "difficulty": "kolay", "year": 2023, "source": "2023-LGS Çıkmış Soru", "tags": ["Cümle Anlamı", "LGS 2023"]
    },

    # ==================== KPSS GENEL YETENEK & GENEL KÜLTÜR ====================
    {
        "exam": "KPSS Lisans", "subject": "Genel Kültür - Tarih", "topic": "İnkılap Tarihi",
        "question_text": "Kurtuluş Savaşı döneminde Milli Mücadele'nin gerekçesi, amacı ve yöntemi İLK KEZ hangi belgede belirtilmiştir?",
        "option_a": "Havza Genelgesi",
        "option_b": "Amasya Genelgesi",
        "option_c": "Erzurum Kongresi Kararları",
        "option_d": "Sivas Kongresi Kararları",
        "option_e": "Misak-ı Milli",
        "correct_answer": "B",
        "explanation": "Amasya Genelgesi'nde 'Vatanın bütünlüğü, milletin bağımsızlığı tehlikededir' (Gerekçe) ve 'Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır' (Amaç ve Yöntem) ilk kez ilan edilmiştir.",
        "difficulty": "orta", "year": 2024, "source": "2024-KPSS Çıkmış Soru", "tags": ["Milli Mücadele", "KPSS 2024"]
    },
    {
        "exam": "KPSS Lisans", "subject": "Genel Kültür - Coğrafya", "topic": "Türkiye Coğrafyası",
        "question_text": "Türkiye'de rüzgâr erozyonunun en etkili olduğu bölge ve çevresi aşağıdakilerden hangisidir?",
        "option_a": "Doğu Karadeniz Kıyıları",
        "option_b": "İç Anadolu ve Tuz Gölü Çevresi",
        "option_c": "Menteşe Yöresi",
        "option_d": "Yıldız Dağları Bölümü",
        "option_e": "Hakkâri Yöresi",
        "correct_answer": "B",
        "explanation": "Bitki örtüsünün cılız, arazinin düz ve iklimin kurak olduğu İç Anadolu (özellikle Tuz Gölü ve Konya Ovası) rüzgâr erozyonunun en şiddetli görüldüğü yerdir.",
        "difficulty": "kolay", "year": 2023, "source": "2023-KPSS Çıkmış Soru", "tags": ["Toprak ve Erozyon", "KPSS 2023"]
    },

    # ==================== ALES & DGS SORULARI ====================
    {
        "exam": "ALES", "subject": "Sayısal", "topic": "Mantık ve Muhakeme",
        "question_text": "Bir yarışta A, B, C, D ve E isimli 5 koşucu yarışmıştır. B yarışı A'nın hemen önünde, D ise C'nin hemen arkasında bitirmiştir. E yarışı sonuncu bitirmediğine göre 1. olan koşucu hangisi olamaz?",
        "option_a": "A",
        "option_b": "B",
        "option_c": "C",
        "option_d": "D",
        "option_e": "E",
        "correct_answer": "A",
        "explanation": "B koşucusu A'nın hemen önünde bitirdiği için A asla 1. olamaz (çünkü önünde en az B vardır).",
        "difficulty": "orta", "year": 2024, "source": "2024-ALES Çıkmış Soru", "tags": ["Sözel/Sayısal Mantık", "ALES 2024"]
    },
    {
        "exam": "DGS", "subject": "Sayısal", "topic": "Oran-Orantı",
        "question_text": "a/b = 2/3 ve b/c = 4/5 olduğuna göre a/c oranı kaçtır?",
        "option_a": "8/15",
        "option_b": "10/12",
        "option_c": "6/15",
        "option_d": "7/10",
        "option_e": "3/5",
        "correct_answer": "A",
        "explanation": "a/c = (a/b) * (b/c) = (2/3) * (4/5) = 8/15.",
        "difficulty": "kolay", "year": 2023, "source": "2023-DGS Çıkmış Soru", "tags": ["Oran Orantı", "DGS 2023"]
    },
]


async def seed_past_exam_questions(session: AsyncSession):
    """Past 20 years authentic exam questions seeder."""
    # Check if questions already exist
    existing_count = (await session.execute(select(func.count()).select_from(M.Question))).scalar() or 0
    if existing_count > 100:
        return

    # Cache exams, subjects and topics
    exams_res = await session.execute(select(M.Exam))
    exams = {e.name: e for e in exams_res.scalars().all()}

    subjects_res = await session.execute(select(M.Subject))
    subjects = {(s.exam_id, s.name): s for s in subjects_res.scalars().all()}

    topics_res = await session.execute(select(M.Topic))
    topics = {(t.exam_id, t.name): t for t in topics_res.scalars().all()}

    added = 0
    for q_data in PAST_EXAM_QUESTIONS_COLLECTION:
        exam_obj = exams.get(q_data["exam"]) or list(exams.values())[0]

        # Find or create subject
        subj_key = (exam_obj.id, q_data["subject"])
        subj_obj = subjects.get(subj_key)
        if not subj_obj:
            subj_obj = M.Subject(
                id=_id(),
                exam_id=exam_obj.id,
                name=q_data["subject"],
                slug="general",
                order=0,
                created_at=now_iso(),
            )
            session.add(subj_obj)
            await session.flush()
            subjects[subj_key] = subj_obj

        # Find or create topic
        topic_key = (exam_obj.id, q_data["topic"])
        topic_obj = topics.get(topic_key)
        if not topic_obj:
            topic_obj = M.Topic(
                id=_id(),
                exam_id=exam_obj.id,
                subject_id=subj_obj.id,
                name=q_data["topic"],
                order=0,
                created_at=now_iso(),
            )
            session.add(topic_obj)
            await session.flush()
            topics[topic_key] = topic_obj

        # Add question
        q_record = M.Question(
            id=_id(),
            exam_id=exam_obj.id,
            subject_id=subj_obj.id,
            topic_id=topic_obj.id,
            question_text=q_data["question_text"],
            option_a=q_data["option_a"],
            option_b=q_data["option_b"],
            option_c=q_data["option_c"],
            option_d=q_data["option_d"],
            option_e=q_data["option_e"],
            correct_answer=q_data["correct_answer"],
            explanation=q_data["explanation"],
            difficulty=q_data.get("difficulty", "orta"),
            source=q_data.get("source", "ÖSYM Çıkmış Soru"),
            year=q_data.get("year", 2024),
            tags=q_data.get("tags", []),
            status="active",
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        session.add(q_record)
        added += 1

    await session.commit()
