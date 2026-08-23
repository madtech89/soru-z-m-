import uuid
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from auth import hash_password
import models as M


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
    return M.Question(
        id=_id(),
        exam_id=exam_id,
        subject_id=subject_id,
        topic_id=topic_id,
        subtopic_id=None,
        question_text=f"{topic_name} konusundan örnek soru #{idx}: Aşağıdakilerden hangisi doğrudur?",
        question_type="multiple_choice",
        option_a="Birinci seçenek",
        option_b="İkinci seçenek",
        option_c="Üçüncü seçenek",
        option_d="Dördüncü seçenek",
        option_e="Beşinci seçenek",
        correct_answer=correct,
        explanation=f"Bu soru {topic_name} konusunun temel kavramını ölçer. Doğru cevap {correct} seçeneğidir.",
        difficulty=DIFFS[idx % 3],
        source="Örnek Soru Bankası",
        year=2024,
        tags=[subject_name, topic_name],
        status="active",
        created_at=now_iso(),
        updated_at=now_iso(),
    )


async def seed_content(db: AsyncSession):
    exam_count = (await db.execute(select(func.count()).select_from(M.Exam))).scalar() or 0
    if exam_count > 0:
        return

    # 1. Seed Exams
    exam_ids = {}
    for i, (name, desc, etype) in enumerate(EXAM_CATALOG):
        eid = _id()
        exam_ids[name] = eid
        db.add(M.Exam(
            id=eid, name=name, description=desc, exam_type=etype,
            status="active", order=i, created_at=now_iso(),
        ))
    await db.flush()

    # 2. Seed Subjects
    subject_map = {}  # (exam_name, sname) -> sid
    for exam_name, subs in SUBJECTS_BY_EXAM.items():
        eid = exam_ids[exam_name]
        for so, (sname, slug) in enumerate(subs):
            sid = _id()
            subject_map[(exam_name, sname)] = sid
            db.add(M.Subject(
                id=sid, exam_id=eid, name=sname, slug=slug,
                order=so, status="active", created_at=now_iso(),
            ))
    await db.flush()

    # 3. Seed Topics
    topic_map = {}  # (exam_name, sname, tname) -> tid
    for exam_name, subs in SUBJECTS_BY_EXAM.items():
        eid = exam_ids[exam_name]
        for so, (sname, slug) in enumerate(subs):
            sid = subject_map[(exam_name, sname)]
            for to, tname in enumerate(TOPICS.get(sname, [])):
                tid = _id()
                topic_map[(exam_name, sname, tname)] = tid
                db.add(M.Topic(
                    id=tid, exam_id=eid, subject_id=sid, name=tname,
                    order=to, status="active", created_at=now_iso(),
                ))
    await db.flush()

    # 4. Seed Questions
    questions_docs = []
    for exam_name, subs in SUBJECTS_BY_EXAM.items():
        eid = exam_ids[exam_name]
        for so, (sname, slug) in enumerate(subs):
            sid = subject_map[(exam_name, sname)]
            for to, tname in enumerate(TOPICS.get(sname, [])):
                tid = topic_map[(exam_name, sname, tname)]
                for qi in range(1, 7):  # 6 questions per topic
                    q = _make_question(eid, sid, tid, sname, tname, qi)
                    questions_docs.append(q)
                    db.add(q)
    await db.flush()

    # 5. Seed Denemeler (Tests)
    for exam_name in ["YKS", "KPSS Lisans"]:
        eid = exam_ids[exam_name]
        exam_questions = [q for q in questions_docs if q.exam_id == eid]
        for level, count, minutes in [("Başlangıç Denemesi", 10, 20),
                                      ("Genel Deneme", 20, 40),
                                      ("Zor Deneme", 15, 35)]:
            picked = random.sample(exam_questions, min(count, len(exam_questions)))
            db.add(M.Test(
                id=_id(), exam_id=eid,
                name=f"{exam_name} {level}",
                description=f"{exam_name} için hazırlanmış {len(picked)} soruluk deneme.",
                duration_minutes=minutes,
                question_ids=[q.id for q in picked],
                difficulty="orta",
                status="published",
                created_at=now_iso(),
            ))
    await db.flush()

    # 6. Seed Demo Users & Activity
    await _seed_demo_users(db, questions_docs, exam_ids)
    await db.commit()


async def _seed_demo_users(db: AsyncSession, questions_docs, exam_ids):
    demo_res = await db.execute(select(M.User).where(M.User.email == "demo@sinav.com"))
    demo = demo_res.scalars().first()
    if not demo:
        demo_id = _id()
        demo = M.User(
            id=demo_id,
            email="demo@sinav.com",
            password_hash=hash_password("demo123"),
            name="Demo Öğrenci",
            username="demoogrenci",
            role="user",
            avatar="",
            target_exams=[exam_ids["YKS"]],
            target_score=480,
            daily_goal=40,
            xp=1250,
            streak=6,
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        db.add(demo)
        await db.flush()
        await _seed_answers_for(db, demo_id, questions_docs, exam_ids["YKS"], solved=90)
        await _seed_results_for(db, demo_id, exam_ids["YKS"], n=5, base_score=360)

    # A few leaderboard filler users
    filler = ["Ayşe Y.", "Mehmet K.", "Zeynep A.", "Can T.", "Elif D."]
    for i, nm in enumerate(filler):
        email = f"user{i+1}@sinav.com"
        u_res = await db.execute(select(M.User).where(M.User.email == email))
        if u_res.scalars().first():
            continue
        uid = _id()
        db.add(M.User(
            id=uid,
            email=email, password_hash=hash_password("user123"),
            name=nm, username=f"user{i+1}", role="user",
            avatar="",
            target_exams=[exam_ids["YKS"]],
            target_score=400 + i * 15,
            daily_goal=30, xp=2000 - i * 250, streak=10 - i,
            created_at=now_iso(),
            updated_at=now_iso(),
        ))
        await db.flush()
        await _seed_answers_for(db, uid, questions_docs, exam_ids["YKS"], solved=60 - i * 8)
        await _seed_results_for(db, uid, exam_ids["YKS"], n=4 - (i % 2), base_score=420 - i * 20)


async def _seed_results_for(db: AsyncSession, user_id, exam_id, n=4, base_score=380):
    t_res = await db.execute(select(M.Test).where(M.Test.exam_id == exam_id).limit(50))
    tests = t_res.scalars().all()
    if not tests:
        return
    base = datetime.now(timezone.utc)
    for j in range(n):
        t = random.choice(tests)
        total = len(t.question_ids or []) or 20
        score = max(0, min(500, base_score + random.randint(-40, 60)))
        correct = int(total * (score / 500) * 0.9)
        wrong = max(0, int((total - correct) * 0.6))
        blank = total - correct - wrong
        net = round(correct - wrong / 4, 2)
        db.add(M.UserTestResult(
            id=_id(), user_id=user_id, session_id=_id(),
            test_id=t.id, test_name=t.name, exam_id=exam_id,
            total=total, correct=correct, wrong=wrong, blank=blank,
            net=net, score=score,
            success_rate=round(correct / max(1, correct + wrong) * 100, 1),
            created_at=(base - timedelta(days=random.randint(0, 20))).isoformat(),
        ))


async def _seed_answers_for(db: AsyncSession, user_id, questions_docs, exam_id, solved=60):
    exam_qs = [q for q in questions_docs if q.exam_id == exam_id]
    picked = random.sample(exam_qs, min(solved, len(exam_qs)))
    base = datetime.now(timezone.utc)
    for i, q in enumerate(picked):
        roll = random.random()
        is_blank = roll < 0.1
        is_correct = (not is_blank) and roll < 0.65
        if is_correct:
            selected = q.correct_answer
        elif is_blank:
            selected = None
        else:
            opts = [o for o in ["A", "B", "C", "D", "E"] if o != q.correct_answer]
            selected = random.choice(opts)
        created = (base - timedelta(days=random.randint(0, 6),
                                    hours=random.randint(0, 12))).isoformat()
        db.add(M.UserAnswer(
            id=_id(), user_id=user_id, question_id=q.id,
            exam_id=exam_id, subject_id=q.subject_id, topic_id=q.topic_id,
            selected_answer=selected, correct_answer=q.correct_answer,
            is_correct=is_correct, is_blank=is_blank,
            time_spent=random.randint(25, 120),
            exam_session_id=None, created_at=created,
        ))


async def seed_extras(db: AsyncSession):
    """Seed study notes for topics across exams + scoring configs."""
    note_count = (await db.execute(select(func.count()).select_from(M.StudyNote))).scalar() or 0
    if note_count == 0:
        subjects_res = await db.execute(select(M.Subject))
        subjects = {s.id: s for s in subjects_res.scalars().all()}
        
        topics_res = await db.execute(select(M.Topic))
        topics = topics_res.scalars().all()
        by_exam = {}
        for t in topics:
            by_exam.setdefault(t.exam_id, []).append(t)
            
        for exam_id, ts in by_exam.items():
            for t in ts[:6]:
                subj = subjects.get(t.subject_id)
                sname = subj.name if subj else ""
                db.add(M.StudyNote(
                    id=_id(),
                    title=f"{t.name} — Konu Anlatımı",
                    description=f"{sname} dersi {t.name} konusunun özet ders notu.",
                    exam_id=exam_id, subject_id=t.subject_id, topic_id=t.id,
                    content=(
                        f"{t.name} konusu {sname} dersinin önemli başlıklarındandır. "
                        "Aşağıda temel kavramlar, sık yapılan hatalar ve çözüm stratejileri özetlenmiştir.\n\n"
                        "Temel kavramlar: tanım, temel özellikler, formüller ve kullanım alanları dikkatle çalışılmalıdır. "
                        "Sık yapılan hatalar genellikle işlem hataları ve kavram yanılgılarından kaynaklanır.\n\n"
                        "Strateji: önce kolay sorularla ısın, ardından orta ve zor seviyeye geç. Süreni ölç; "
                        "90 saniyeyi aşan soruları işaretle ve sona bırak. Yanlışlarını mutlaka tekrar çöz."
                    ),
                    video_url="", file_path=None, file_name=None,
                    status="published", published_at=now_iso(), created_at=now_iso(),
                ))
        await db.commit()

    # Scoring configs
    exams_res = await db.execute(select(M.Exam))
    exams = exams_res.scalars().all()
    for e in exams:
        subs_res = await db.execute(select(M.Subject).where(M.Subject.exam_id == e.id).order_by(M.Subject.order))
        subs = subs_res.scalars().all()
        if not subs:
            continue
        sub_names = {s.name for s in subs}
        cfg = e.scoring_config
        if cfg and cfg.get("sections") and {sec["name"] for sec in cfg["sections"]} == sub_names:
            continue
        sections = [{"name": s.name, "question_count": 20, "wrong_penalty": 0.25, "coefficient": 1.0} for s in subs]
        e.scoring_config = {
            "sections": sections, "base_score": 100.0, "multiplier": 1.0, "score_type": "Ağırlıklı Puan",
        }
    await db.commit()
