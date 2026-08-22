import uuid
import random
from datetime import datetime, timezone, timedelta
from auth import hash_password


def _id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# Static exam catalog (order preserved). Admin can add more later.
EXAM_CATALOG = [
    ("YKS", "Yükseköğretim Kurumları Sınavı", "general"),
    ("TYT", "Temel Yeterlilik Testi", "general"),
    ("AYT", "Alan Yeterlilik Testi", "general"),
    ("KPSS Lisans", "Kamu Personeli Seçme Sınavı - Lisans", "general"),
    ("KPSS Ön Lisans", "Kamu Personeli Seçme Sınavı - Ön Lisans", "general"),
    ("TUS", "Tıpta Uzmanlık Sınavı", "general"),
    ("DUS", "Diş Hekimliğinde Uzmanlık Sınavı", "general"),
    ("ALES", "Akademik Personel ve Lisansüstü Eğitim Sınavı", "general"),
    ("DGS", "Dikey Geçiş Sınavı", "general"),
    ("YDS", "Yabancı Dil Sınavı", "general"),
]

# Subject palette slugs used by frontend for multi-tone coloring
SUBJECTS_BY_EXAM = {
    "YKS": [
        ("Matematik", "matematik"),
        ("Türkçe", "turkce"),
        ("Fizik", "fen"),
        ("Kimya", "fen"),
        ("Tarih", "sosyal"),
    ],
    "KPSS Lisans": [
        ("Genel Yetenek - Matematik", "matematik"),
        ("Genel Yetenek - Türkçe", "turkce"),
        ("Genel Kültür - Tarih", "sosyal"),
        ("Genel Kültür - Coğrafya", "sosyal"),
    ],
    "TUS": [
        ("Farmakoloji", "fen"),
        ("Anatomi", "fen"),
        ("Fizyoloji", "matematik"),
    ],
}

TOPICS = {
    "Matematik": ["Fonksiyonlar", "Problemler", "Polinomlar", "Türev"],
    "Türkçe": ["Paragraf", "Dil Bilgisi", "Sözcükte Anlam"],
    "Fizik": ["Kuvvet ve Hareket", "Elektrik", "Optik"],
    "Kimya": ["Atom Yapısı", "Periyodik Sistem"],
    "Tarih": ["İnkılap Tarihi", "Osmanlı Tarihi"],
    "Genel Yetenek - Matematik": ["Problemler", "Sayılar", "Rasyonel Sayılar"],
    "Genel Yetenek - Türkçe": ["Paragraf", "Anlatım Bozukluğu"],
    "Genel Kültür - Tarih": ["Kurtuluş Savaşı", "Osmanlı Devleti"],
    "Genel Kültür - Coğrafya": ["Türkiye'nin İklimi", "Nüfus"],
    "Farmakoloji": ["Antibiyotikler", "Analjezikler"],
    "Anatomi": ["Kaslar", "Sinir Sistemi"],
    "Fizyoloji": ["Kalp", "Solunum"],
}

DIFFS = ["kolay", "orta", "zor"]


def _make_question(exam_id, subject_id, topic_id, subject_name, topic_name, idx):
    correct = random.choice(["A", "B", "C", "D", "E"])
    return {
        "id": _id(),
        "exam_id": exam_id,
        "subject_id": subject_id,
        "topic_id": topic_id,
        "subtopic_id": None,
        "question_text": f"{topic_name} konusundan örnek soru #{idx}: Aşağıdakilerden hangisi doğrudur?",
        "question_type": "multiple_choice",
        "option_a": "Birinci seçenek",
        "option_b": "İkinci seçenek",
        "option_c": "Üçüncü seçenek",
        "option_d": "Dördüncü seçenek",
        "option_e": "Beşinci seçenek",
        "correct_answer": correct,
        "explanation": f"Bu soru {topic_name} konusunun temel kavramını ölçer. Doğru cevap {correct} seçeneğidir.",
        "difficulty": DIFFS[idx % 3],
        "source": "Örnek Soru Bankası",
        "year": 2024,
        "tags": [subject_name, topic_name],
        "status": "active",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


async def seed_content(db):
    if await db.exams.count_documents({}) > 0:
        return

    exams_docs = []
    exam_ids = {}
    for i, (name, desc, etype) in enumerate(EXAM_CATALOG):
        eid = _id()
        exam_ids[name] = eid
        exams_docs.append({
            "id": eid, "name": name, "description": desc, "exam_type": etype,
            "status": "active", "order": i, "created_at": now_iso(),
        })
    await db.exams.insert_many(exams_docs)

    subjects_docs, topics_docs, questions_docs = [], [], []
    topic_registry = []  # (exam_id, subject_id, topic_id, subject_name, topic_name, slug)

    for exam_name, subs in SUBJECTS_BY_EXAM.items():
        eid = exam_ids[exam_name]
        for so, (sname, slug) in enumerate(subs):
            sid = _id()
            subjects_docs.append({
                "id": sid, "exam_id": eid, "name": sname, "slug": slug,
                "order": so, "status": "active", "created_at": now_iso(),
            })
            for to, tname in enumerate(TOPICS.get(sname, [])):
                tid = _id()
                topics_docs.append({
                    "id": tid, "exam_id": eid, "subject_id": sid, "name": tname,
                    "order": to, "status": "active", "created_at": now_iso(),
                })
                topic_registry.append((eid, sid, tid, sname, tname, slug))
                for qi in range(1, 7):  # 6 questions per topic
                    questions_docs.append(
                        _make_question(eid, sid, tid, sname, tname, qi)
                    )

    await db.subjects.insert_many(subjects_docs)
    await db.topics.insert_many(topics_docs)
    await db.questions.insert_many(questions_docs)

    # Build a few denemeler (tests) for YKS and KPSS Lisans
    tests_docs = []
    for exam_name in ["YKS", "KPSS Lisans"]:
        eid = exam_ids[exam_name]
        exam_questions = [q for q in questions_docs if q["exam_id"] == eid]
        for level, count, minutes in [("Başlangıç Denemesi", 10, 20),
                                      ("Genel Deneme", 20, 40),
                                      ("Zor Deneme", 15, 35)]:
            picked = random.sample(exam_questions, min(count, len(exam_questions)))
            tests_docs.append({
                "id": _id(), "exam_id": eid,
                "name": f"{exam_name} {level}",
                "description": f"{exam_name} için hazırlanmış {len(picked)} soruluk deneme.",
                "duration_minutes": minutes,
                "question_ids": [q["id"] for q in picked],
                "difficulty": "orta",
                "status": "published",
                "created_at": now_iso(),
            })
    await db.tests.insert_many(tests_docs)

    await _seed_demo_users(db, questions_docs, exam_ids)


async def _seed_demo_users(db, questions_docs, exam_ids):
    # Demo primary user with performance history
    demo = await db.users.find_one({"email": "demo@sinav.com"})
    if not demo:
        res = await db.users.insert_one({
            "email": "demo@sinav.com",
            "password_hash": hash_password("demo123"),
            "name": "Demo Öğrenci",
            "username": "demoogrenci",
            "role": "user",
            "avatar": "",
            "target_exams": [exam_ids["YKS"]],
            "target_score": 480,
            "daily_goal": 40,
            "xp": 1250,
            "streak": 6,
            "created_at": now_iso(),
        })
        demo_id = str(res.inserted_id)
        await _seed_answers_for(db, demo_id, questions_docs, exam_ids["YKS"], solved=90)
        await _seed_results_for(db, demo_id, exam_ids["YKS"], n=5, base_score=360)

    # A few leaderboard filler users
    filler = ["Ayşe Y.", "Mehmet K.", "Zeynep A.", "Can T.", "Elif D."]
    for i, nm in enumerate(filler):
        email = f"user{i+1}@sinav.com"
        if await db.users.find_one({"email": email}):
            continue
        res = await db.users.insert_one({
            "email": email, "password_hash": hash_password("user123"),
            "name": nm, "username": f"user{i+1}", "role": "user",
            "target_exams": [exam_ids["YKS"]],
            "target_score": 400 + i * 15,
            "daily_goal": 30, "xp": 2000 - i * 250, "streak": 10 - i,
            "created_at": now_iso(),
        })
        await _seed_answers_for(db, str(res.inserted_id), questions_docs,
                                exam_ids["YKS"], solved=60 - i * 8)
        await _seed_results_for(db, str(res.inserted_id), exam_ids["YKS"],
                                n=4 - (i % 2), base_score=420 - i * 20)


async def _seed_results_for(db, user_id, exam_id, n=4, base_score=380):
    tests = await db.tests.find({"exam_id": exam_id}).to_list(50)
    if not tests:
        return
    base = datetime.now(timezone.utc)
    docs = []
    for j in range(n):
        t = random.choice(tests)
        total = len(t.get("question_ids", [])) or 20
        score = max(0, min(500, base_score + random.randint(-40, 60)))
        correct = int(total * (score / 500) * 0.9)
        wrong = max(0, int((total - correct) * 0.6))
        blank = total - correct - wrong
        net = round(correct - wrong / 4, 2)
        docs.append({
            "id": _id(), "user_id": user_id, "session_id": _id(),
            "test_id": t["id"], "test_name": t["name"], "exam_id": exam_id,
            "total": total, "correct": correct, "wrong": wrong, "blank": blank,
            "net": net, "score": score,
            "success_rate": round(correct / max(1, correct + wrong) * 100, 1),
            "created_at": (base - timedelta(days=random.randint(0, 20))).isoformat(),
        })
    if docs:
        await db.user_test_results.insert_many(docs)


async def _seed_answers_for(db, user_id, questions_docs, exam_id, solved=60):
    exam_qs = [q for q in questions_docs if q["exam_id"] == exam_id]
    picked = random.sample(exam_qs, min(solved, len(exam_qs)))
    answers = []
    base = datetime.now(timezone.utc)
    correct_count = 0
    for i, q in enumerate(picked):
        roll = random.random()
        is_blank = roll < 0.1
        is_correct = (not is_blank) and roll < 0.65
        if is_correct:
            selected = q["correct_answer"]
            correct_count += 1
        elif is_blank:
            selected = None
        else:
            opts = [o for o in ["A", "B", "C", "D", "E"] if o != q["correct_answer"]]
            selected = random.choice(opts)
        created = (base - timedelta(days=random.randint(0, 6),
                                    hours=random.randint(0, 12))).isoformat()
        answers.append({
            "id": _id(), "user_id": user_id, "question_id": q["id"],
            "exam_id": exam_id, "subject_id": q["subject_id"], "topic_id": q["topic_id"],
            "selected_answer": selected, "correct_answer": q["correct_answer"],
            "is_correct": is_correct, "is_blank": is_blank,
            "time_spent": random.randint(25, 120),
            "exam_session_id": None, "created_at": created,
        })
    if answers:
        await db.user_answers.insert_many(answers)
