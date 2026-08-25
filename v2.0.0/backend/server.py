from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import secrets
import csv
import logging
import math
import asyncio
import random
from datetime import datetime, timezone, timedelta



from typing import List, Optional, Dict, Any

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form, Header, BackgroundTasks
from fastapi.staticfiles import StaticFiles

from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import select, update, delete, func, desc, and_, or_

from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

import random
from database import engine, AsyncSessionLocal, get_db, init_models
import models as M
import auth as A
import storage as S
import ai as AICoach
from seed import seed_content, seed_extras, now_iso
from seed_past_exams import seed_past_exam_questions
from seed_comprehensive_curriculum import seed_comprehensive_curriculum



app = FastAPI(title="HedefMatik Sınav Hazırlık ve Tercih Platformu API v2")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sinav")


# ---------- Dependencies ----------
async def current_user(request: Request, db: AsyncSession = Depends(get_db)):
    return await A.get_current_user(request, db)


async def admin_user(request: Request, db: AsyncSession = Depends(get_db)):
    user = await A.get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = ""
    kvkk_consent: Optional[bool] = False
    marketing_consent: Optional[bool] = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class ProfileIn(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    avatar: Optional[str] = None
    phone: Optional[str] = None
    target_exams: Optional[List[str]] = None
    target_score: Optional[float] = None
    daily_goal: Optional[int] = None
    level: Optional[int] = None
    placement_completed: Optional[bool] = None


class ExamIn(BaseModel):
    name: str
    description: str = ""
    exam_type: str = "general"
    category: str = "universite"
    status: str = "active"


class SubjectIn(BaseModel):
    exam_id: str
    name: str
    slug: str = "general"
    order: int = 0


class TopicIn(BaseModel):
    exam_id: str
    subject_id: str
    name: str
    order: int = 0


class SubtopicIn(BaseModel):
    topic_id: str
    name: str
    order: int = 0


class QuestionIn(BaseModel):
    exam_id: str
    subject_id: str
    topic_id: str
    subtopic_id: Optional[str] = None
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str] = ""
    correct_answer: str
    explanation: str = ""
    difficulty: str = "orta"
    source: str = ""
    year: Optional[int] = None
    tags: List[str] = []


class TestIn(BaseModel):
    exam_id: str
    name: str
    description: str = ""
    duration_minutes: int = 30
    question_ids: List[str] = []
    difficulty: str = "orta"
    status: str = "published"


class AnswerItem(BaseModel):
    question_id: str
    selected_answer: Optional[str] = None
    time_spent: int = 0


class SubmitIn(BaseModel):
    session_id: Optional[str] = None
    answers: List[AnswerItem]


class PracticeAnswerIn(BaseModel):
    question_id: str
    selected_answer: Optional[str] = None
    time_spent: int = 0


class ChatMessageIn(BaseModel):
    content: str


# ============ AUTH ============
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    res = await db.execute(select(M.User).where(M.User.email == email))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    uid = str(uuid.uuid4())
    now_str = now_iso()
    user_obj = M.User(
        id=uid,
        email=email,
        password_hash=A.hash_password(body.password),
        name=body.name,
        username=email.split("@")[0],
        role="user",
        avatar="",
        phone=body.phone or "",
        kvkk_consent=body.kvkk_consent or False,
        marketing_consent=body.marketing_consent or False,
        consent_date=now_str if body.kvkk_consent else None,
        level=1,
        placement_completed=False,
        target_exams=[],
        target_score=None,
        daily_goal=20,
        xp=0,
        streak=0,
        ai_credits=100,
        created_at=now_str,
        updated_at=now_str,
    )
    db.add(user_obj)
    await db.flush()  # get uid without commit

    # Welcome bonus transaction
    welcome_tx = M.CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=uid,
        amount=100,
        type="welcome_bonus",
        description="Hoş Geldin Hediyesi — 100 AI Kredisi",
        balance_after=100,
        created_at=now_str,
    )
    db.add(welcome_tx)
    await db.commit()

    access = A.create_access_token(uid, email)
    refresh = A.create_refresh_token(uid)
    A.set_auth_cookies(response, access, refresh)
    return {"user": user_obj.to_dict(), "token": access}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    ident = email

    att_res = await db.execute(select(M.LoginAttempt).where(M.LoginAttempt.identifier == ident))
    attempt = att_res.scalars().first()
    if attempt and attempt.count >= 5:
        if attempt.locked_until and datetime.fromisoformat(attempt.locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Çok fazla deneme. 15 dakika sonra tekrar deneyin.")

    user_res = await db.execute(select(M.User).where(M.User.email == email))
    user_obj = user_res.scalars().first()

    if not user_obj or not A.verify_password(body.password, user_obj.password_hash):
        if attempt:
            attempt.count += 1
            attempt.locked_until = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        else:
            db.add(M.LoginAttempt(
                id=str(uuid.uuid4()),
                identifier=ident,
                count=1,
                locked_until=(datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
                created_at=now_iso(),
            ))
        await db.commit()
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    if attempt:
        await db.delete(attempt)
        await db.commit()

    access = A.create_access_token(user_obj.id, email)
    refresh = A.create_refresh_token(user_obj.id)
    A.set_auth_cookies(response, access, refresh)
    return {"user": user_obj.to_dict(), "token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": user}


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    user_res = await db.execute(select(M.User).where(M.User.email == email))
    user_obj = user_res.scalars().first()
    if user_obj:
        token = secrets.token_urlsafe(32)
        db.add(M.PasswordResetToken(
            id=str(uuid.uuid4()),
            email=email,
            token=token,
            expires_at=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            created_at=now_iso(),
        ))
        await db.commit()
        logger.info(f"Şifre sıfırlama linki: {os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}")
    return {"ok": True, "message": "Şifre sıfırlama bağlantısı gönderildi."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn, db: AsyncSession = Depends(get_db)):
    tok_res = await db.execute(select(M.PasswordResetToken).where(M.PasswordResetToken.token == body.token))
    tok_obj = tok_res.scalars().first()
    if not tok_obj:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş bağlantı")
    if datetime.fromisoformat(tok_obj.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Bağlantı süresi dolmuş")

    user_res = await db.execute(select(M.User).where(M.User.email == tok_obj.email))
    user_obj = user_res.scalars().first()
    if user_obj:
        user_obj.password_hash = A.hash_password(body.password)
        user_obj.updated_at = now_iso()
    await db.delete(tok_obj)
    await db.commit()
    return {"ok": True, "message": "Şifreniz başarıyla güncellendi."}


# ============ PROFILE ============
@api.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    user_res = await db.execute(select(M.User).where(M.User.id == uid))
    user_obj = user_res.scalars().first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return {"user": user_obj.to_dict()}

    for k, v in data.items():
        setattr(user_obj, k, v)
    user_obj.updated_at = now_iso()
    await db.commit()
    return {"user": user_obj.to_dict()}


# ============ EXAMS / HIERARCHY ============
@api.get("/exams")
async def list_exams(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.status == "active").order_by(M.Exam.order))
    exams = res.scalars().all()
    return [e.to_dict() for e in exams]


@api.get("/exams/{exam_id}")
async def get_exam(exam_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam = res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    return exam.to_dict()


@api.get("/exams/{exam_id}/subjects")
async def get_exam_subjects(exam_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.Subject)
        .where(and_(M.Subject.exam_id == exam_id, M.Subject.status == "active"))
        .order_by(M.Subject.order)
    )
    subjects = res.scalars().all()
    return [s.to_dict() for s in subjects]


@api.get("/subjects/{subject_id}/topics")
async def get_subject_topics(subject_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.Topic)
        .where(and_(M.Topic.subject_id == subject_id, M.Topic.status == "active"))
        .order_by(M.Topic.order)
    )
    topics = res.scalars().all()
    return [t.to_dict() for t in topics]


@api.get("/topics/{topic_id}/subtopics")
async def get_topic_subtopics(topic_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.Subtopic)
        .where(M.Subtopic.topic_id == topic_id)
        .order_by(M.Subtopic.order)
    )
    subtopics = res.scalars().all()
    return [st.to_dict() for st in subtopics]


# ============ QUESTIONS ============
@api.get("/questions")
async def list_questions(
    exam_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.Question).where(M.Question.status == "active")
    if exam_id:
        stmt = stmt.where(M.Question.exam_id == exam_id)
    if subject_id:
        stmt = stmt.where(M.Question.subject_id == subject_id)
    if topic_id:
        stmt = stmt.where(M.Question.topic_id == topic_id)
    if difficulty:
        stmt = stmt.where(M.Question.difficulty == difficulty)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    items_stmt = stmt.order_by(desc(M.Question.created_at)).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(items_stmt)
    items = res.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [q.to_dict() for q in items],
    }


@api.get("/questions/{question_id}")
async def get_question(question_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Question).where(M.Question.id == question_id))
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")
    return q.to_dict()


@api.post("/questions/{question_id}/answer")
async def answer_question(
    question_id: str,
    body: PracticeAnswerIn,
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(M.Question).where(M.Question.id == question_id))
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")

    selected = body.selected_answer
    is_blank = selected is None or selected == ""
    is_correct = (not is_blank) and (selected.upper() == q.correct_answer.upper())

    ans = M.UserAnswer(
        id=str(uuid.uuid4()),
        user_id=user["id"],
        question_id=q.id,
        exam_id=q.exam_id,
        subject_id=q.subject_id,
        topic_id=q.topic_id,
        selected_answer=selected,
        correct_answer=q.correct_answer,
        is_correct=is_correct,
        is_blank=is_blank,
        time_spent=body.time_spent,
        exam_session_id=None,
        created_at=now_iso(),
    )
    db.add(ans)

    u_res = await db.execute(select(M.User).where(M.User.id == user["id"]))
    user_obj = u_res.scalars().first()
    if user_obj:
        user_obj.xp = (user_obj.xp or 0) + (10 if is_correct else 2)
    await db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": q.correct_answer,
        "explanation": q.explanation or "",
    }


# ============ TESTS / DENEMELER ============
@api.get("/tests")
async def list_tests(exam_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(M.Test).where(M.Test.status == "published")
    if exam_id:
        stmt = stmt.where(M.Test.exam_id == exam_id)
    res = await db.execute(stmt.order_by(desc(M.Test.created_at)))
    tests = res.scalars().all()
    return [t.to_dict() for t in tests]


@api.get("/tests/{test_id}")
async def get_test(test_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Test).where(M.Test.id == test_id))
    test = res.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")

    test_dict = test.to_dict()
    q_ids = test_dict.get("question_ids") or []
    if q_ids:
        q_res = await db.execute(select(M.Question).where(M.Question.id.in_(q_ids)))
        loaded_qs = {q.id: q.to_dict() for q in q_res.scalars().all()}
        test_dict["questions"] = [loaded_qs[qid] for qid in q_ids if qid in loaded_qs]
    else:
        test_dict["questions"] = []

    return test_dict


@api.post("/topics/{topic_id}/start-quiz")
async def start_topic_quiz(
    topic_id: str,
    count: int = Query(20, ge=5, le=50),
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Konu anlatımı bitince o konudan rastgele soru havuzundan test oluşturur ve başlatır."""
    t_res = await db.execute(select(M.Topic).where(M.Topic.id == topic_id))
    topic = t_res.scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")

    s_res = await db.execute(select(M.Subject).where(M.Subject.id == topic.subject_id))
    subject = s_res.scalars().first()
    exam_id = subject.exam_id if subject else ""

    # 1. Konuya ait sorular
    q_res = await db.execute(
        select(M.Question.id).where(
            and_(M.Question.topic_id == topic_id, M.Question.status == "active")
        )
    )
    all_q_ids = [r[0] for r in q_res.all()]

    # 2. Yeterli soru yoksa aynı dersteki diğer konulardan tamamla
    if len(all_q_ids) < count and subject:
        extra_res = await db.execute(
            select(M.Question.id).where(
                and_(
                    M.Question.subject_id == subject.id,
                    M.Question.status == "active",
                    ~M.Question.id.in_(all_q_ids) if all_q_ids else True
                )
            ).limit(count - len(all_q_ids))
        )
        extra_ids = [r[0] for r in extra_res.all()]
        all_q_ids.extend(extra_ids)

    # 3. Hâlâ yoksa genel sınav havuzundan tamamla
    if not all_q_ids and exam_id:
        extra_res = await db.execute(
            select(M.Question.id).where(
                and_(M.Question.exam_id == exam_id, M.Question.status == "active")
            ).limit(count)
        )
        all_q_ids = [r[0] for r in extra_res.all()]

    if not all_q_ids:
        raise HTTPException(status_code=404, detail="Bu konu için henüz soru havuzunda soru bulunamadı.")

    selected_ids = random.sample(all_q_ids, min(len(all_q_ids), count))
    now_str = now_iso()
    test_id = str(uuid.uuid4())
    test_name = f"🎯 {topic.name} — {len(selected_ids)} Soruluk Konu Testi"

    test_obj = M.Test(
        id=test_id,
        exam_id=exam_id,
        name=test_name,
        description=f"{subject.name if subject else ''} › {topic.name} konusu için soru havuzundan rastgele seçilmiş pekiştirme testi.",
        duration=max(15, len(selected_ids) * 2),
        total_questions=len(selected_ids),
        difficulty="orta",
        question_ids=selected_ids,
        status="published",
        created_at=now_str,
    )
    db.add(test_obj)

    session_id = str(uuid.uuid4())
    session_obj = M.TestSession(
        id=session_id,
        test_id=test_id,
        user_id=user["id"],
        status="in_progress",
        start_time=now_str,
        end_time=None,
        answers={},
        marked={},
        created_at=now_str,
    )
    db.add(session_obj)
    await db.commit()

    return {
        "test_id": test_id,
        "session_id": session_id,
        "test_name": test_name,
        "question_count": len(selected_ids),
        "duration": test_obj.duration,
    }


@api.post("/tests/{test_id}/start")
async def start_test(test_id: str, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Test).where(M.Test.id == test_id))
    test = res.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")

    session = M.TestSession(
        id=str(uuid.uuid4()),
        test_id=test_id,
        user_id=user["id"],
        status="in_progress",
        start_time=now_iso(),
        end_time=None,
        answers={},
        marked={},
        created_at=now_iso(),
    )
    db.add(session)
    await db.commit()
    return session.to_dict()


@api.post("/tests/{test_id}/submit")
async def submit_test(
    test_id: str,
    body: SubmitIn,
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(M.Test).where(M.Test.id == test_id))
    test = res.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")

    q_ids = [a.question_id for a in body.answers]
    q_res = await db.execute(select(M.Question).where(M.Question.id.in_(q_ids)))
    questions = {q.id: q for q in q_res.scalars().all()}

    subjects_res = await db.execute(select(M.Subject).where(M.Subject.exam_id == test.exam_id))
    subjects = {s.id: s.name for s in subjects_res.scalars().all()}

    correct = 0
    wrong = 0
    blank = 0
    section_map: Dict[str, Dict[str, Any]] = {}
    session_id = body.session_id or str(uuid.uuid4())
    now_str = now_iso()

    for item in body.answers:
        q = questions.get(item.question_id)
        if not q:
            continue

        selected = item.selected_answer
        is_blank = selected is None or selected == ""
        is_correct = (not is_blank) and (selected.upper() == q.correct_answer.upper())

        if is_correct:
            correct += 1
        elif is_blank:
            blank += 1
        else:
            wrong += 1

        sec_name = subjects.get(q.subject_id, "Genel")
        if sec_name not in section_map:
            section_map[sec_name] = {"correct": 0, "wrong": 0, "blank": 0, "total": 0}
        section_map[sec_name]["total"] += 1
        if is_correct:
            section_map[sec_name]["correct"] += 1
        elif is_blank:
            section_map[sec_name]["blank"] += 1
        else:
            section_map[sec_name]["wrong"] += 1

        db.add(M.UserAnswer(
            id=str(uuid.uuid4()),
            user_id=user["id"],
            question_id=q.id,
            exam_id=q.exam_id,
            subject_id=q.subject_id,
            topic_id=q.topic_id,
            selected_answer=selected,
            correct_answer=q.correct_answer,
            is_correct=is_correct,
            is_blank=is_blank,
            time_spent=item.time_spent,
            exam_session_id=session_id,
            created_at=now_str,
        ))

    total = correct + wrong + blank
    net = round(correct - (wrong * 0.25), 2)
    score = round(max(100.0, 100.0 + (net * 4.0)), 1)

    # ─── Gelişim & İlerleme Karşılaştırma Motoru ────────────────────────────
    # Kullanıcının AYNI testteki veya benzer başlıktaki en son önceki sonucunu bul
    prev_res = await db.execute(
        select(M.UserTestResult)
        .where(
            and_(
                M.UserTestResult.user_id == user["id"],
                or_(
                    M.UserTestResult.test_id == test.id,
                    M.UserTestResult.test_name == test.name,
                )
            )
        )
        .order_by(desc(M.UserTestResult.created_at))
        .limit(1)
    )
    prev = prev_res.scalars().first()

    comparison = None
    if prev:
        prev_net = float(prev.net or 0.0)
        prev_score = float(prev.score or 0.0)
        net_diff = round(net - prev_net, 2)
        score_diff = round(score - prev_score, 1)

        if prev_net != 0:
            pct_change = round(((net - prev_net) / max(0.1, abs(prev_net))) * 100, 1)
        else:
            pct_change = 100.0 if net > 0 else 0.0

        if net_diff > 0:
            progress_msg = f"🎉 Muhteşem Gelişim! Bir önceki denemene göre +{net_diff} Net (%{abs(pct_change)}) artış sağladın! Düzenli çalışmanın karşılığını alıyorsun, tebrikler!"
            status_type = "improved"
        elif net_diff == 0:
            progress_msg = f"⚖️ İstikrarlı Performans! Önceki denemeyle aynı seviyedesin ({net} Net). Şimdi hedef eksik konuları kapatıp netlerini daha da yukarı taşımak!"
            status_type = "same"
        else:
            progress_msg = f"💡 Bu testte {net_diff} netlik bir dalgalanma oldu. Hiç moralini bozma! Yanlış yaptığın soruların çözümlerini inceleyip konu anlatımına tekrar göz at."
            status_type = "declined"

        comparison = {
            "is_first_attempt": False,
            "previous_net": prev_net,
            "previous_score": prev_score,
            "current_net": net,
            "net_diff": net_diff,
            "score_diff": score_diff,
            "pct_change": pct_change,
            "previous_correct": prev.correct,
            "previous_wrong": prev.wrong,
            "previous_date": prev.created_at,
            "progress_message": progress_msg,
            "status_type": status_type,
        }
    else:
        comparison = {
            "is_first_attempt": True,
            "current_net": net,
            "progress_message": "🌟 Bu sınavdaki ilk sonucun başarıyla kaydedildi! Bir sonraki denemende net artışın ve gelişim yüzden burada canlı karşılaştırılacak.",
            "status_type": "first",
        }

    result_doc = M.UserTestResult(
        id=str(uuid.uuid4()),
        user_id=user["id"],
        session_id=session_id,
        test_id=test.id,
        test_name=test.name,
        exam_id=test.exam_id,
        total=total,
        correct=correct,
        wrong=wrong,
        blank=blank,
        net=net,
        score=score,
        success_rate=round((correct / max(1, correct + wrong)) * 100, 1),
        section_breakdown=section_map,
        created_at=now_str,
    )
    db.add(result_doc)

    u_res = await db.execute(select(M.User).where(M.User.id == user["id"]))
    user_obj = u_res.scalars().first()
    if user_obj:
        user_obj.xp = (user_obj.xp or 0) + (correct * 15) + 50
    await db.commit()

    res_dict = result_doc.to_dict()
    res_dict["comparison"] = comparison
    return res_dict



@api.get("/tests/{test_id}/review/{session_id}")
async def review_test(test_id: str, session_id: str, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    t_res = await db.execute(select(M.Test).where(M.Test.id == test_id))
    test = t_res.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")

    ans_res = await db.execute(
        select(M.UserAnswer).where(
            and_(M.UserAnswer.user_id == user["id"], M.UserAnswer.exam_session_id == session_id)
        )
    )
    answers = {a.question_id: a for a in ans_res.scalars().all()}

    q_ids = test.question_ids or []
    q_res = await db.execute(select(M.Question).where(M.Question.id.in_(q_ids)))
    questions = {q.id: q for q in q_res.scalars().all()}

    items = []
    for qid in q_ids:
        q = questions.get(qid)
        if not q:
            continue
        ans = answers.get(qid)
        items.append({
            "question": q.to_dict(),
            "selected_answer": ans.selected_answer if ans else None,
            "is_correct": ans.is_correct if ans else False,
            "is_blank": ans.is_blank if ans else True,
            "time_spent": ans.time_spent if ans else 0,
        })

    return {
        "test": test.to_dict(),
        "session_id": session_id,
        "items": items,
    }


# ============ TERCİH ROBOTU (UNIVERSITY PROGRAMS) ============

class ProgramCreateIn(BaseModel):
    university: str
    faculty: Optional[str] = ""
    program: str
    score_type: str = "SAY"
    exam_type: str = "YKS"
    city: str = ""
    duration_years: int = 4
    scholarship: Optional[str] = ""
    score_2025: float = 0.0
    score_2024: float = 0.0
    score_2023: float = 0.0
    rank_2025: int = 0
    rank_2024: int = 0
    rank_2023: int = 0
    quota: int = 0
    status: str = "active"

class ProgramUpdateIn(BaseModel):
    university: Optional[str] = None
    faculty: Optional[str] = None
    program: Optional[str] = None
    score_type: Optional[str] = None
    exam_type: Optional[str] = None
    city: Optional[str] = None
    duration_years: Optional[int] = None
    scholarship: Optional[str] = None
    score_2025: Optional[float] = None
    score_2024: Optional[float] = None
    score_2023: Optional[float] = None
    rank_2025: Optional[int] = None
    rank_2024: Optional[int] = None
    rank_2023: Optional[int] = None
    quota: Optional[int] = None
    status: Optional[str] = None

class ProgramBulkImportIn(BaseModel):
    programs: List[dict]


@api.get("/tercih/programs")
async def list_university_programs(
    score_type: Optional[str] = None,
    city: Optional[str] = None,
    cities: Optional[str] = None,
    university: Optional[str] = None,
    universities: Optional[str] = None,
    program: Optional[str] = None,
    programs: Optional[str] = None,
    search: Optional[str] = None,
    user_score: Optional[float] = None,
    user_rank: Optional[int] = None,
    category_filter: Optional[str] = None,
    sort_by: Optional[str] = "score_desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.UniversityProgram).where(M.UniversityProgram.status == "active")

    # Score type mapping
    if score_type:
        st_clean = score_type.strip().upper()
        if st_clean in ["SAYISAL", "SAY"]:
            stmt = stmt.where(or_(M.UniversityProgram.score_type == "SAY", M.UniversityProgram.score_type == "sayisal"))
        elif st_clean in ["ESIT_AGIRLIK", "EA", "EŞİT AĞIRLIK"]:
            stmt = stmt.where(or_(M.UniversityProgram.score_type == "EA", M.UniversityProgram.score_type == "esit_agirlik"))
        elif st_clean in ["SOZEL", "SOZ", "SÖZ", "SÖZEL"]:
            stmt = stmt.where(or_(M.UniversityProgram.score_type == "SÖZ", M.UniversityProgram.score_type == "SÖZEL", M.UniversityProgram.score_type == "sozel", M.UniversityProgram.score_type == "SOZ"))
        elif st_clean in ["DIL", "DİL"]:
            stmt = stmt.where(or_(M.UniversityProgram.score_type == "DİL", M.UniversityProgram.score_type == "DIL", M.UniversityProgram.score_type == "dil"))
        elif st_clean in ["TYT", "ONLISANS", "ÖNLİSANS"]:
            stmt = stmt.where(or_(M.UniversityProgram.score_type == "TYT", M.UniversityProgram.score_type == "tyt"))
        else:
            stmt = stmt.where(M.UniversityProgram.score_type == score_type)

    # Multi-city filtering (supports comma-separated)
    all_cities = []
    if cities:
        all_cities.extend([c.strip() for c in cities.split(",") if c.strip()])
    if city and city not in all_cities:
        all_cities.append(city.strip())
    if all_cities:
        stmt = stmt.where(M.UniversityProgram.city.in_(all_cities))

    # Multi-university filtering
    all_unis = []
    if universities:
        all_unis.extend([u.strip() for u in universities.split(",") if u.strip()])
    if university and university not in all_unis:
        all_unis.append(university.strip())
    if all_unis:
        stmt = stmt.where(M.UniversityProgram.university.in_(all_unis))

    # Multi-program filtering
    all_progs = []
    if programs:
        all_progs.extend([p.strip() for p in programs.split(",") if p.strip()])
    if program and program not in all_progs:
        all_progs.append(program.strip())
    if all_progs:
        prog_filters = [M.UniversityProgram.program.ilike(f"%{p}%") for p in all_progs]
        stmt = stmt.where(or_(*prog_filters))

    # Multi-term / Comma-separated universal search
    if search:
        search_terms = [s.strip() for s in search.split(",") if s.strip()]
        if search_terms:
            or_clauses = []
            for term in search_terms:
                t_filter = f"%{term}%"
                or_clauses.extend([
                    M.UniversityProgram.program.ilike(t_filter),
                    M.UniversityProgram.university.ilike(t_filter),
                    M.UniversityProgram.faculty.ilike(t_filter),
                    M.UniversityProgram.city.ilike(t_filter),
                ])
            stmt = stmt.where(or_(*or_clauses))

    res = await db.execute(stmt)
    all_items = res.scalars().all()

    # Calculate Probability & Enrich Items
    enriched_items = []
    for p in all_items:
        d = p.to_dict()
        category = "likely"
        probability = 50
        rank_diff = 0
        score_diff = 0.0

        if user_rank is not None and user_rank > 0 and (p.rank_2025 or 0) > 0:
            target_rank = p.rank_2025
            rank_diff = target_rank - user_rank
            ratio = user_rank / target_rank

            if ratio <= 0.85:
                category = "guaranteed"
                probability = min(99, int(90 + (1 - ratio) * 20))
            elif ratio <= 1.05:
                category = "likely"
                probability = max(55, int(75 - (ratio - 0.85) * 80))
            elif ratio <= 1.30:
                category = "reach"
                probability = max(25, int(45 - (ratio - 1.05) * 80))
            else:
                category = "dream"
                probability = max(5, int(20 - (ratio - 1.30) * 40))

        elif user_score is not None and user_score > 0:
            target_score = p.score_2025 or 0.0
            score_diff = round(user_score - target_score, 2)
            if score_diff >= 10:
                category = "guaranteed"
                probability = 92
            elif score_diff >= -5:
                category = "likely"
                probability = 72
            elif score_diff >= -18:
                category = "reach"
                probability = 42
            else:
                category = "dream"
                probability = 15

        d["recommendation_category"] = category
        d["probability"] = probability
        d["rank_diff"] = rank_diff
        d["score_diff"] = score_diff
        enriched_items.append(d)

    # Category Filter
    if category_filter and category_filter != "all":
        enriched_items = [x for x in enriched_items if x["recommendation_category"] == category_filter]

    # Sorting
    if sort_by == "chance":
        enriched_items.sort(key=lambda x: (-x["probability"], x.get("rank_2025") or 999999))
    elif sort_by == "rank_asc":
        enriched_items.sort(key=lambda x: (x.get("rank_2025") or 999999))
    elif sort_by == "rank_desc":
        enriched_items.sort(key=lambda x: -(x.get("rank_2025") or 0))
    elif sort_by == "score_asc":
        enriched_items.sort(key=lambda x: (x.get("score_2025") or 0.0))
    elif sort_by == "quota_desc":
        enriched_items.sort(key=lambda x: -(x.get("quota") or 0))
    elif sort_by == "name_asc":
        enriched_items.sort(key=lambda x: x.get("program", ""))
    else:  # score_desc
        enriched_items.sort(key=lambda x: -(x.get("score_2025") or 0.0))

    total = len(enriched_items)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paged_items = enriched_items[start_idx:end_idx]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": paged_items,
    }


@api.get("/tercih/cities")
async def list_tercih_cities(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.UniversityProgram.city)
        .where(M.UniversityProgram.city != "")
        .distinct()
        .order_by(M.UniversityProgram.city)
    )
    return [row[0] for row in res.all() if row[0]]


@api.get("/tercih/universities")
async def list_tercih_universities(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.UniversityProgram.university)
        .where(M.UniversityProgram.university != "")
        .distinct()
        .order_by(M.UniversityProgram.university)
    )
    return [row[0] for row in res.all() if row[0]]


@api.get("/tercih/departments")
async def list_tercih_departments(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.UniversityProgram.program)
        .where(M.UniversityProgram.program != "")
        .distinct()
        .order_by(M.UniversityProgram.program)
    )
    return [row[0] for row in res.all() if row[0]]


# ============ ADMIN: TERCİH PROGRAMLARI YÖNETİMİ ============

@api.get("/admin/tercih/programs")
async def admin_list_tercih_programs(
    search: Optional[str] = None,
    city: Optional[str] = None,
    score_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.UniversityProgram)
    if search:
        sf = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                M.UniversityProgram.program.ilike(sf),
                M.UniversityProgram.university.ilike(sf),
                M.UniversityProgram.faculty.ilike(sf),
                M.UniversityProgram.city.ilike(sf),
            )
        )
    if city:
        stmt = stmt.where(M.UniversityProgram.city == city)
    if score_type:
        stmt = stmt.where(M.UniversityProgram.score_type == score_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    order_stmt = stmt.order_by(desc(M.UniversityProgram.score_2025)).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(order_stmt)
    items = [p.to_dict() for p in res.scalars().all()]

    return {"total": total, "page": page, "page_size": page_size, "items": items}


@api.post("/admin/tercih/programs")
async def admin_create_tercih_program(
    body: ProgramCreateIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    p_obj = M.UniversityProgram(
        id=str(uuid.uuid4()),
        university=body.university,
        faculty=body.faculty or "",
        program=body.program,
        exam_type=body.exam_type or "YKS",
        score_type=body.score_type or "SAY",
        city=body.city or "",
        duration_years=body.duration_years or 4,
        scholarship=body.scholarship or "",
        score_2025=body.score_2025 or 0.0,
        score_2024=body.score_2024 or 0.0,
        score_2023=body.score_2023 or 0.0,
        rank_2025=body.rank_2025 or 0,
        rank_2024=body.rank_2024 or 0,
        rank_2023=body.rank_2023 or 0,
        quota=body.quota or 0,
        order=0,
        status=body.status or "active",
        created_at=now_iso(),
    )
    db.add(p_obj)
    await db.commit()
    return p_obj.to_dict()


@api.put("/admin/tercih/programs/{program_id}")
async def admin_update_tercih_program(
    program_id: str,
    body: ProgramUpdateIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(M.UniversityProgram).where(M.UniversityProgram.id == program_id))
    p = res.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Program bulunamadı")

    for k, v in body.dict(exclude_unset=True).items():
        if v is not None:
            setattr(p, k, v)

    await db.commit()
    return p.to_dict()


@api.delete("/admin/tercih/programs/{program_id}")
async def admin_delete_tercih_program(
    program_id: str,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(M.UniversityProgram).where(M.UniversityProgram.id == program_id))
    p = res.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Program bulunamadı")

    await db.delete(p)
    await db.commit()
    return {"ok": True}


@api.post("/admin/tercih/bulk-import")
async def admin_bulk_import_tercih(
    body: ProgramBulkImportIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    added_count = 0
    now = now_iso()
    for row in body.programs:
        if not row.get("university") or not row.get("program"):
            continue
        p_obj = M.UniversityProgram(
            id=str(uuid.uuid4()),
            university=row.get("university"),
            faculty=row.get("faculty", ""),
            program=row.get("program"),
            exam_type=row.get("exam_type", "YKS"),
            score_type=row.get("score_type", "SAY"),
            city=row.get("city", ""),
            duration_years=int(row.get("duration_years", 4)),
            scholarship=row.get("scholarship", ""),
            score_2025=float(row.get("score_2025", 0.0)),
            score_2024=float(row.get("score_2024", 0.0)),
            score_2023=float(row.get("score_2023", 0.0)),
            rank_2025=int(row.get("rank_2025", 0)),
            rank_2024=int(row.get("rank_2024", 0)),
            rank_2023=int(row.get("rank_2023", 0)),
            quota=int(row.get("quota", 0)),
            order=0,
            status=row.get("status", "active"),
            created_at=now,
        )
        db.add(p_obj)
        added_count += 1

    await db.commit()
    return {"ok": True, "count": added_count}



# ============ BADGES (ROZETLER) ============
@api.get("/badges")
async def list_badges(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Badge).order_by(M.Badge.requirement_value))
    return [b.to_dict() for b in res.scalars().all()]


@api.get("/user/badges")
async def get_user_badges(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.UserBadge, M.Badge)
        .join(M.Badge, M.UserBadge.badge_id == M.Badge.id)
        .where(M.UserBadge.user_id == user["id"])
    )
    earned = []
    for ub, b in res.all():
        d = b.to_dict()
        d["earned_at"] = ub.earned_at
        earned.append(d)
    return earned


@api.post("/user/badges/check")
async def check_user_badges(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    ans_count = (await db.execute(select(func.count()).select_from(M.UserAnswer).where(M.UserAnswer.user_id == uid))).scalar() or 0
    test_count = (await db.execute(select(func.count()).select_from(M.UserTestResult).where(M.UserTestResult.user_id == uid))).scalar() or 0
    streak = user.get("streak", 0)

    all_badges_res = await db.execute(select(M.Badge))
    all_badges = all_badges_res.scalars().all()

    user_badges_res = await db.execute(select(M.UserBadge.badge_id).where(M.UserBadge.user_id == uid))
    earned_badge_ids = {row[0] for row in user_badges_res.all()}

    newly_awarded = []
    for b in all_badges:
        if b.id in earned_badge_ids:
            continue
        qualifies = False
        if b.requirement_type == "questions_count" and ans_count >= b.requirement_value:
            qualifies = True
        elif b.requirement_type == "tests_count" and test_count >= b.requirement_value:
            qualifies = True
        elif b.requirement_type == "streak_days" and streak >= b.requirement_value:
            qualifies = True

        if qualifies:
            db.add(M.UserBadge(id=str(uuid.uuid4()), user_id=uid, badge_id=b.id, earned_at=now_iso()))
            newly_awarded.append(b.to_dict())

    if newly_awarded:
        await db.commit()
    return {"newly_awarded": newly_awarded}


# ============ AI CHAT (SOHBET ASİSTANI) ============
@api.get("/chat/conversations")
async def list_chat_conversations(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.ChatConversation)
        .where(M.ChatConversation.user_id == user["id"])
        .order_by(desc(M.ChatConversation.created_at))
    )
    return [c.to_dict() for c in res.scalars().all()]


@api.post("/chat/conversations")
async def create_chat_conversation(body: dict, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    title = body.get("title", "Yeni Sohbet")
    conv = M.ChatConversation(
        id=str(uuid.uuid4()),
        user_id=user["id"],
        title=title,
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    db.add(conv)
    await db.commit()
    return conv.to_dict()


@api.get("/chat/conversations/{conv_id}/messages")
async def get_chat_messages(conv_id: str, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.ChatMessage)
        .where(and_(M.ChatMessage.conversation_id == conv_id, M.ChatMessage.user_id == user["id"]))
        .order_by(M.ChatMessage.created_at)
    )
    return [m.to_dict() for m in res.scalars().all()]


@api.post("/chat/conversations/{conv_id}/messages")
async def send_chat_message(
    conv_id: str,
    body: ChatMessageIn,
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    user_msg = M.ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        user_id=user["id"],
        role="user",
        content=body.content,
        created_at=now_iso(),
    )
    db.add(user_msg)
    await db.flush()

    # Generate assistant reply with AI multi-provider & multi-key failover
    try:
        reply_text = await AICoach.generate_chat_reply(
            body.content,
            user_name=user.get("name", "Öğrenci")
        )
    except Exception as e:
        logger.warning(f"AI chat error: {e}")
        reply_text = (
            f"Harika bir soru! {user.get('name', 'Öğrenci')}, bu konuyu pekiştirmek için konu anlatım özetlerini okuyabilir "
            f"ve soru bankasındaki testleri çözebilirsin. Başarı düzenli tekrarda saklıdır!"
        )

    assistant_msg = M.ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        user_id=user["id"],
        role="assistant",
        content=reply_text,
        created_at=now_iso(),
    )
    db.add(assistant_msg)

    await db.commit()

    return assistant_msg.to_dict()


@api.delete("/chat/conversations/{conv_id}")
async def delete_chat_conversation(conv_id: str, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.ChatConversation).where(
            and_(M.ChatConversation.id == conv_id, M.ChatConversation.user_id == user["id"])
        )
    )
    conv = res.scalars().first()
    if conv:
        await db.delete(conv)
        await db.commit()
    return {"ok": True}


# ============ USER DASHBOARD & STATS ============
# ============ USER DASHBOARD & STATS ============
@api.get("/user/dashboard")
async def user_dashboard(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()

    all_ans_res = await db.execute(
        select(M.UserAnswer.is_correct, M.UserAnswer.topic_id, M.UserAnswer.subject_id, M.UserAnswer.created_at)
        .where(M.UserAnswer.user_id == uid)
    )
    all_answers = all_ans_res.all()

    today_answers = [a for a in all_answers if a.created_at >= today_start]
    solved_today = len(today_answers)
    correct_today = sum(1 for a in today_answers if a.is_correct)
    success_today = round((correct_today / max(1, solved_today)) * 100, 1)

    total_answers = len(all_answers)
    correct_answers = sum(1 for a in all_answers if a.is_correct)
    overall_success = round((correct_answers / max(1, total_answers)) * 100, 1)

    # 7 day series for charts
    series = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_str = day_date.strftime("%Y-%m-%d")
        count = sum(1 for a in all_answers if a.created_at.startswith(day_str))
        series.append({
            "day": day_date.strftime("%a"),
            "date": day_date.strftime("%d %b"),
            "solved": count,
            "count": count,
        })

    # Recent test results
    results_res = await db.execute(
        select(M.UserTestResult)
        .where(M.UserTestResult.user_id == uid)
        .order_by(desc(M.UserTestResult.created_at))
        .limit(10)
    )
    recent_results = [r.to_dict() for r in results_res.scalars().all()]
    total_tests = len(recent_results)
    avg_score = round(sum(r["score"] for r in recent_results) / max(1, total_tests), 1) if total_tests > 0 else 0

    # Calculate weak topics with subject names
    topic_map: Dict[str, Dict[str, Any]] = {}
    for a in all_answers:
        if a.topic_id not in topic_map:
            topic_map[a.topic_id] = {"total": 0, "correct": 0, "subject_id": a.subject_id}
        topic_map[a.topic_id]["total"] += 1
        if a.is_correct:
            topic_map[a.topic_id]["correct"] += 1

    t_ids = list(topic_map.keys())
    topics = {}
    subjects = {}
    if t_ids:
        t_res = await db.execute(select(M.Topic).where(M.Topic.id.in_(t_ids)))
        topics = {t.id: t for t in t_res.scalars().all()}
        s_ids = list({t.subject_id for t in topics.values()})
        if s_ids:
            s_res = await db.execute(select(M.Subject).where(M.Subject.id.in_(s_ids)))
            subjects = {s.id: s.name for s in s_res.scalars().all()}

    weak_topics_list = []
    for tid, st in topic_map.items():
        t = topics.get(tid)
        tname = t.name if t else "Genel Konu"
        sname = subjects.get(t.subject_id, "Genel") if t else "Genel"
        prof = round((st["correct"] / max(1, st["total"])) * 100)
        status = "Kritik Eksik" if prof < 50 else "Geliştirilmeli" if prof < 75 else "İyi"
        weak_topics_list.append({
            "topic_id": tid,
            "topic_name": tname,
            "subject_name": sname,
            "proficiency": prof,
            "status": status,
            "total": st["total"],
            "correct": st["correct"],
        })
    weak_topics_list = sorted(weak_topics_list, key=lambda x: x["proficiency"])

    # Recommended tests
    target_exams = user.get("target_exams") or []
    test_stmt = select(M.Test).where(M.Test.status == "published")
    if target_exams:
        test_stmt = test_stmt.where(M.Test.exam_id == target_exams[0])
    t_res = await db.execute(test_stmt.limit(4))
    recommended_tests = [t.to_dict() for t in t_res.scalars().all()]
    if not recommended_tests:
        all_t_res = await db.execute(select(M.Test).where(M.Test.status == "published").limit(4))
        recommended_tests = [t.to_dict() for t in all_t_res.scalars().all()]

    return {
        "solved_today": solved_today,
        "today_solved": solved_today,
        "daily_goal": user.get("daily_goal", 20),
        "success_today": success_today,
        "total_solved": total_answers,
        "overall_success": overall_success,
        "avg_score": avg_score,
        "total_tests": total_tests,
        "xp": user.get("xp", 0),
        "streak": user.get("streak", 0),
        "level": user.get("level", 1),
        "series": series,
        "daily_stats": series,
        "weak_topics": weak_topics_list,
        "recent_results": recent_results,
        "recommended_tests": recommended_tests,
    }



@api.get("/user/weak-topics")
async def weak_topics(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    ans_res = await db.execute(
        select(M.UserAnswer.topic_id, M.UserAnswer.is_correct)
        .where(M.UserAnswer.user_id == uid)
    )
    answers = ans_res.all()
    if not answers:
        return {"critical": [], "improvement": [], "good": []}

    topic_stats: Dict[str, Dict[str, int]] = {}
    for a in answers:
        if a.topic_id not in topic_stats:
            topic_stats[a.topic_id] = {"total": 0, "correct": 0}
        topic_stats[a.topic_id]["total"] += 1
        if a.is_correct:
            topic_stats[a.topic_id]["correct"] += 1

    t_ids = list(topic_stats.keys())
    t_res = await db.execute(select(M.Topic).where(M.Topic.id.in_(t_ids)))
    topics = {t.id: t for t in t_res.scalars().all()}

    critical, improvement, good = [], [], []
    for tid, st in topic_stats.items():
        t = topics.get(tid)
        tname = t.name if t else "Bilinmeyen Konu"
        rate = round((st["correct"] / st["total"]) * 100, 1)
        item = {
            "topic_id": tid,
            "topic_name": tname,
            "total": st["total"],
            "correct": st["correct"],
            "success_rate": rate,
        }
        if rate < 50:
            critical.append(item)
        elif rate < 75:
            improvement.append(item)
        else:
            good.append(item)

    return {
        "critical": sorted(critical, key=lambda x: x["success_rate"]),
        "improvement": sorted(improvement, key=lambda x: x["success_rate"]),
        "good": sorted(good, key=lambda x: -x["success_rate"]),
    }


class NoteActivityIn(BaseModel):
    note_id: str
    seconds_spent: int = 0



@api.post("/user/note-activity")
async def record_note_activity(
    body: NoteActivityIn,
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["id"]
    res = await db.execute(
        select(M.UserNoteActivity).where(
            and_(M.UserNoteActivity.user_id == uid, M.UserNoteActivity.note_id == body.note_id)
        )
    )
    act = res.scalars().first()
    if not act:
        act = M.UserNoteActivity(
            id=str(uuid.uuid4()),
            user_id=uid,
            note_id=body.note_id,
            seconds_spent=body.seconds_spent,
            last_studied_at=now_iso(),
        )
        db.add(act)
    else:
        act.seconds_spent = (act.seconds_spent or 0) + body.seconds_spent
        act.last_studied_at = now_iso()

    # Reward XP for studying
    if body.seconds_spent >= 30:
        u_res = await db.execute(select(M.User).where(M.User.id == uid))
        u_obj = u_res.scalars().first()
        if u_obj:
            u_obj.xp = (u_obj.xp or 0) + min(20, max(5, body.seconds_spent // 30))

    await db.commit()
    return act.to_dict()


@api.get("/user/activity-summary")
async def get_user_activity_summary(
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["id"]

    # 1. Note Activities
    act_res = await db.execute(
        select(M.UserNoteActivity).where(M.UserNoteActivity.user_id == uid).order_by(desc(M.UserNoteActivity.last_studied_at))
    )
    activities = act_res.scalars().all()
    note_ids = [a.note_id for a in activities]

    notes_map = {}
    if note_ids:
        n_res = await db.execute(select(M.StudyNote).where(M.StudyNote.id.in_(note_ids)))
        notes_map = {n.id: n for n in n_res.scalars().all()}

    # Subjects & Exams Map
    subj_ids = [n.subject_id for n in notes_map.values()]
    subj_map = {}
    if subj_ids:
        s_res = await db.execute(select(M.Subject).where(M.Subject.id.in_(subj_ids)))
        subj_map = {s.id: s.name for s in s_res.scalars().all()}

    note_activity_list = []
    total_seconds = 0
    for a in activities:
        n = notes_map.get(a.note_id)
        if not n:
            continue
        total_seconds += (a.seconds_spent or 0)
        note_activity_list.append({
            "note_id": a.note_id,
            "title": n.title,
            "subject_name": subj_map.get(n.subject_id, "Genel"),
            "seconds_spent": a.seconds_spent or 0,
            "minutes_spent": round((a.seconds_spent or 0) / 60, 1),
            "last_studied_at": a.last_studied_at,
        })

    # 2. Solved Tests / Exams
    results_res = await db.execute(
        select(M.UserTestResult).where(M.UserTestResult.user_id == uid).order_by(desc(M.UserTestResult.created_at))
    )
    test_results = [r.to_dict() for r in results_res.scalars().all()]

    return {
        "user": user,
        "note_activities": note_activity_list,
        "total_study_minutes": round(total_seconds / 60, 1),
        "test_results": test_results,
        "total_tests_completed": len(test_results),
    }


# ============ STUDY NOTES ============

@api.get("/study-notes")
async def list_study_notes(
    exam_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.StudyNote).where(M.StudyNote.status == "published")
    if exam_id:
        stmt = stmt.where(M.StudyNote.exam_id == exam_id)
    if subject_id:
        stmt = stmt.where(M.StudyNote.subject_id == subject_id)
    if topic_id:
        stmt = stmt.where(M.StudyNote.topic_id == topic_id)
    res = await db.execute(stmt.order_by(desc(M.StudyNote.created_at)))
    notes = res.scalars().all()
    return [n.to_dict() for n in notes]


@api.get("/study-notes/{note_id}")
async def get_study_note(note_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.StudyNote).where(M.StudyNote.id == note_id))
    note = res.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Ders notu bulunamadı")
    return note.to_dict()


# ============ SCORE CALCULATOR ============
class ScoreCalcSectionIn(BaseModel):
    name: str
    correct: int = 0
    wrong: int = 0


class ScoreCalcIn(BaseModel):
    exam_id: str
    sections: List[ScoreCalcSectionIn]


@api.post("/score/calculate")
async def calculate_score(body: ScoreCalcIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == body.exam_id))
    exam = res.scalars().first()
    if not exam or not exam.scoring_config:
        raise HTTPException(status_code=404, detail="Sınav puanlama yapılandırması bulunamadı")

    cfg = exam.scoring_config
    base_score = float(cfg.get("base_score", 100.0))
    multiplier = float(cfg.get("multiplier", 1.0))
    cfg_sections = {s["name"]: s for s in cfg.get("sections", [])}

    total_net = 0.0
    weighted_score = 0.0
    details = []

    for user_sec in body.sections:
        sec_cfg = cfg_sections.get(user_sec.name, {})
        penalty = float(sec_cfg.get("wrong_penalty", 0.25))
        coeff = float(sec_cfg.get("coefficient", 1.0))

        net = round(user_sec.correct - (user_sec.wrong * penalty), 2)
        total_net += net
        weighted_score += net * coeff
        details.append({
            "name": user_sec.name,
            "correct": user_sec.correct,
            "wrong": user_sec.wrong,
            "net": net,
            "coefficient": coeff,
        })

    final_score = round(base_score + (weighted_score * multiplier), 2)
    return {
        "score": final_score,
        "total_net": round(total_net, 2),
        "score_type": cfg.get("score_type", "Ağırlıklı Puan"),
        "details": details,
    }


# ============ LEADERBOARD ============
@api.get("/leaderboard")
async def leaderboard(period: str = "all", exam_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(M.User).where(M.User.role == "user").order_by(desc(M.User.xp)).limit(50)
    res = await db.execute(stmt)
    users = res.scalars().all()
    rankings = []
    for rank, u in enumerate(users, start=1):
        d = u.to_dict()
        d["rank"] = rank
        rankings.append(d)
    return rankings


# ============ AI COACH ============
@api.post("/ai/coach")
async def ai_coach(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    ans_res = await db.execute(
        select(M.UserAnswer.topic_id, M.UserAnswer.is_correct)
        .where(M.UserAnswer.user_id == uid)
    )
    all_answers = ans_res.all()
    all_ans = len(all_answers)
    correct_ans = sum(1 for a in all_answers if a.is_correct)
    overall = round((correct_ans / max(1, all_ans)) * 100, 1)

    res_stmt = select(func.avg(M.UserTestResult.score)).where(M.UserTestResult.user_id == uid)
    avg_score = (await db.execute(res_stmt)).scalar()
    avg_score = round(float(avg_score), 1) if avg_score is not None else None

    topic_map: Dict[str, Dict[str, int]] = {}
    for a in all_answers:
        if a.topic_id not in topic_map:
            topic_map[a.topic_id] = {"total": 0, "correct": 0}
        topic_map[a.topic_id]["total"] += 1
        if a.is_correct:
            topic_map[a.topic_id]["correct"] += 1

    t_ids = list(topic_map.keys())
    topics = {}
    if t_ids:
        t_res = await db.execute(select(M.Topic).where(M.Topic.id.in_(t_ids)))
        topics = {t.id: t.name for t in t_res.scalars().all()}

    weak, strong = [], []
    for tid, st in topic_map.items():
        rate = (st["correct"] / st["total"]) * 100
        tname = topics.get(tid, "Konu")
        if rate < 60:
            weak.append(tname)
        else:
            strong.append(tname)

    target_exam = ""
    if user.get("target_exams"):
        te_res = await db.execute(select(M.Exam).where(M.Exam.id == user["target_exams"][0]))
        te = te_res.scalars().first()
        target_exam = te.name if te else ""

    context = {
        "user_id": uid,
        "target_exam": target_exam,
        "target_score": user.get("target_score"),
        "avg_score": avg_score,
        "daily_goal": user.get("daily_goal", 20),
        "total_solved": all_ans,
        "overall_success": overall,
        "weak": weak,
        "strong": strong,
    }

    try:
        result = await AICoach.generate_coach(context)
    except Exception as ex:
        logger.error(f"AI coach error: {ex}")
        raise HTTPException(status_code=502, detail="AI önerisi şu an üretilemedi, lütfen tekrar deneyin.")

    rec = M.AIRecommendation(
        id=str(uuid.uuid4()),
        user_id=uid,
        result=result,
        created_at=now_iso(),
    )
    db.add(rec)
    await db.commit()
    return rec.to_dict()


@api.get("/ai/coach/latest")
async def ai_coach_latest(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(M.AIRecommendation)
        .where(M.AIRecommendation.user_id == user["id"])
        .order_by(desc(M.AIRecommendation.created_at))
        .limit(1)
    )
    rec = res.scalars().first()
    return rec.to_dict() if rec else {}


# ============ ADMIN ANALYTICS & CRUD ============
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    users_count = (await db.execute(select(func.count()).select_from(M.User).where(M.User.role == "user"))).scalar() or 0
    paid_users = (await db.execute(select(func.count()).select_from(M.User).where(and_(M.User.role == "user", M.User.plan.in_(["pro", "premium", "vip"]))))).scalar() or 0
    free_users = max(0, users_count - paid_users)

    exams_count = (await db.execute(select(func.count()).select_from(M.Exam))).scalar() or 0
    subjects_count = (await db.execute(select(func.count()).select_from(M.Subject))).scalar() or 0
    topics_count = (await db.execute(select(func.count()).select_from(M.Topic))).scalar() or 0
    questions_count = (await db.execute(select(func.count()).select_from(M.Question))).scalar() or 0
    tests_count = (await db.execute(select(func.count()).select_from(M.Test))).scalar() or 0
    notes_count = (await db.execute(select(func.count()).select_from(M.StudyNote))).scalar() or 0
    answers_count = (await db.execute(select(func.count()).select_from(M.UserAnswer))).scalar() or 0
    results_count = (await db.execute(select(func.count()).select_from(M.UserTestResult))).scalar() or 0
    total_sec = (await db.execute(select(func.sum(M.UserNoteActivity.seconds_spent)))).scalar() or 0

    return {
        "users": users_count,
        "paid_users": paid_users,
        "free_users": free_users,
        "questions": questions_count,
        "tests": tests_count,
        "subjects": subjects_count,
        "topics": topics_count,
        "notes": notes_count,
        "exams": exams_count,
        "answers": answers_count,
        "results": results_count,
        "total_study_minutes": round(total_sec / 60, 1),
    }


@api.get("/admin/users")
async def admin_list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    plan: Optional[str] = None,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.User)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(M.User.name.ilike(term), M.User.email.ilike(term), M.User.username.ilike(term)))
    if plan:
        stmt = stmt.where(M.User.plan == plan)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(desc(M.User.created_at)).offset((page - 1) * page_size).limit(page_size)
    users_res = await db.execute(stmt)
    users = users_res.scalars().all()

    user_list = []
    for u in users:
        u_dict = u.to_dict()
        solved = (await db.execute(select(func.count()).select_from(M.UserAnswer).where(M.UserAnswer.user_id == u.id))).scalar() or 0
        tests = (await db.execute(select(func.count()).select_from(M.UserTestResult).where(M.UserTestResult.user_id == u.id))).scalar() or 0
        sec = (await db.execute(select(func.sum(M.UserNoteActivity.seconds_spent)).where(M.UserNoteActivity.user_id == u.id))).scalar() or 0
        u_dict["solved_questions"] = solved
        u_dict["completed_tests"] = tests
        u_dict["study_minutes"] = round(sec / 60, 1)
        user_list.append(u_dict)

    return {"items": user_list, "total": total, "page": page, "pages": math.ceil(total / page_size) or 1}


class UpdateUserPlanIn(BaseModel):
    plan: str = "pro"
    expires_at: Optional[str] = None


@api.put("/admin/users/{user_id}/plan")
async def admin_update_user_plan(
    user_id: str,
    body: UpdateUserPlanIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    u_res = await db.execute(select(M.User).where(M.User.id == user_id))
    user_obj = u_res.scalars().first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user_obj.plan = body.plan
    user_obj.plan_expires_at = body.expires_at
    await db.commit()
    return user_obj.to_dict()


class ExamAnalysisIn(BaseModel):
    result_id: Optional[str] = None
    test_id: Optional[str] = None
    total: int = 0
    correct: int = 0
    wrong: int = 0
    blank: int = 0
    net: float = 0.0
    test_name: str = ""
    sections: Dict[str, Any] = {}
    weak_topics: List[Any] = []


@api.post("/ai/analyze-test-performance")
async def ai_analyze_test(
    body: ExamAnalysisIn,
    user: dict = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    from ai import generate_exam_diagnosis
    context = body.dict()
    context["user_name"] = user.get("name", "Öğrenci")
    context["target_score"] = user.get("target_score", 450)

    diagnosis = await generate_exam_diagnosis(context)

    # Save to AIRecommendation in DB
    rec_id = str(uuid.uuid4())
    rec_obj = M.AIRecommendation(
        id=rec_id,
        user_id=user["id"],
        result=diagnosis,
        created_at=now_iso(),
    )
    db.add(rec_obj)
    await db.commit()

    return {"ok": True, "diagnosis": diagnosis, "recommendation_id": rec_id}



@api.post("/admin/exams")
async def admin_create_exam(body: ExamIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    exam_id = str(uuid.uuid4())
    exam_obj = M.Exam(
        id=exam_id,
        name=body.name,
        description=body.description,
        exam_type=body.exam_type,
        category=body.category,
        status=body.status,
        order=0,
        created_at=now_iso(),
    )
    db.add(exam_obj)
    await db.commit()
    return exam_obj.to_dict()


@api.post("/admin/subjects")
async def admin_create_subject(body: SubjectIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    subj_obj = M.Subject(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        name=body.name,
        slug=body.slug,
        order=body.order,
        status="active",
        created_at=now_iso(),
    )
    db.add(subj_obj)
    await db.commit()
    return subj_obj.to_dict()


@api.post("/admin/topics")
async def admin_create_topic(body: TopicIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    topic_obj = M.Topic(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        subject_id=body.subject_id,
        name=body.name,
        order=body.order,
        status="active",
        created_at=now_iso(),
    )
    db.add(topic_obj)
    await db.commit()
    return topic_obj.to_dict()


@api.post("/admin/subtopics")
async def admin_create_subtopic(body: SubtopicIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    subtopic_obj = M.Subtopic(
        id=str(uuid.uuid4()),
        topic_id=body.topic_id,
        name=body.name,
        order=body.order,
        created_at=now_iso(),
    )
    db.add(subtopic_obj)
    await db.commit()
    return subtopic_obj.to_dict()


# ─── CURRICULUM CRUD OPERATIONS (UPDATE & DELETE) ───────────────────────────

@api.put("/admin/exams/{exam_id}")
async def admin_update_exam(exam_id: str, body: ExamIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam = res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    exam.name = body.name
    exam.description = body.description
    exam.exam_type = body.exam_type
    exam.category = body.category
    exam.status = body.status
    await db.commit()
    return exam.to_dict()

@api.delete("/admin/exams/{exam_id}")
async def admin_delete_exam(exam_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam = res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    await db.delete(exam)
    await db.commit()
    return {"ok": True}


@api.put("/admin/subjects/{subject_id}")
async def admin_update_subject(subject_id: str, body: SubjectIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Subject).where(M.Subject.id == subject_id))
    subj = res.scalars().first()
    if not subj:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    subj.exam_id = body.exam_id
    subj.name = body.name
    subj.slug = body.slug
    subj.order = body.order
    await db.commit()
    return subj.to_dict()

@api.delete("/admin/subjects/{subject_id}")
async def admin_delete_subject(subject_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Subject).where(M.Subject.id == subject_id))
    subj = res.scalars().first()
    if not subj:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    await db.delete(subj)
    await db.commit()
    return {"ok": True}


@api.put("/admin/topics/{topic_id}")
async def admin_update_topic(topic_id: str, body: TopicIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Topic).where(M.Topic.id == topic_id))
    topic = res.scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    topic.exam_id = body.exam_id
    topic.subject_id = body.subject_id
    topic.name = body.name
    topic.order = body.order
    await db.commit()
    return topic.to_dict()

@api.delete("/admin/topics/{topic_id}")
async def admin_delete_topic(topic_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Topic).where(M.Topic.id == topic_id))
    topic = res.scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    await db.delete(topic)
    await db.commit()
    return {"ok": True}


class SubtopicUpdateIn(BaseModel):
    topic_id: str
    name: str
    order: int = 0

@api.put("/admin/subtopics/{subtopic_id}")
async def admin_update_subtopic(subtopic_id: str, body: SubtopicUpdateIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Subtopic).where(M.Subtopic.id == subtopic_id))
    subt = res.scalars().first()
    if not subt:
        raise HTTPException(status_code=404, detail="Alt konu bulunamadı")
    subt.topic_id = body.topic_id
    subt.name = body.name
    subt.order = body.order
    await db.commit()
    return subt.to_dict()

@api.delete("/admin/subtopics/{subtopic_id}")
async def admin_delete_subtopic(subtopic_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Subtopic).where(M.Subtopic.id == subtopic_id))
    subt = res.scalars().first()
    if not subt:
        raise HTTPException(status_code=404, detail="Alt konu bulunamadı")
    await db.delete(subt)
    await db.commit()
    return {"ok": True}



@api.post("/admin/questions")
async def admin_create_question(body: QuestionIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    q_obj = M.Question(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        subject_id=body.subject_id,
        topic_id=body.topic_id,
        subtopic_id=body.subtopic_id,
        question_text=body.question_text,
        option_a=body.option_a,
        option_b=body.option_b,
        option_c=body.option_c,
        option_d=body.option_d,
        option_e=body.option_e or "",
        correct_answer=body.correct_answer,
        explanation=body.explanation,
        difficulty=body.difficulty,
        source=body.source,
        year=body.year,
        tags=body.tags,
        status="active",
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    db.add(q_obj)
    await db.commit()
    return q_obj.to_dict()


@api.get("/admin/questions")
async def admin_list_questions(
    exam_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    year: Optional[int] = None,
    page: int = 1,
    page_size: int = 30,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.Question)
    count_stmt = select(func.count()).select_from(M.Question)

    if exam_id:
        stmt = stmt.where(M.Question.exam_id == exam_id)
        count_stmt = count_stmt.where(M.Question.exam_id == exam_id)
    if subject_id:
        stmt = stmt.where(M.Question.subject_id == subject_id)
        count_stmt = count_stmt.where(M.Question.subject_id == subject_id)
    if topic_id:
        stmt = stmt.where(M.Question.topic_id == topic_id)
        count_stmt = count_stmt.where(M.Question.topic_id == topic_id)
    if difficulty:
        stmt = stmt.where(M.Question.difficulty == difficulty)
        count_stmt = count_stmt.where(M.Question.difficulty == difficulty)
    if year:
        stmt = stmt.where(M.Question.year == year)
        count_stmt = count_stmt.where(M.Question.year == year)
    if search:
        s_pat = f"%{search}%"
        stmt = stmt.where(or_(M.Question.question_text.ilike(s_pat), M.Question.source.ilike(s_pat)))
        count_stmt = count_stmt.where(or_(M.Question.question_text.ilike(s_pat), M.Question.source.ilike(s_pat)))

    total = (await db.execute(count_stmt)).scalar() or 0
    offset = max(0, (page - 1) * page_size)
    stmt = stmt.order_by(desc(M.Question.year), desc(M.Question.created_at)).offset(offset).limit(page_size)
    res = await db.execute(stmt)
    questions = [q.to_dict() for q in res.scalars().all()]

    return {
        "items": questions,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class BulkQuestionIn(BaseModel):
    exam_id: str
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    questions: List[Dict[str, Any]]


@api.post("/admin/questions/bulk")
async def admin_bulk_questions(
    body: BulkQuestionIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.questions:
        raise HTTPException(status_code=400, detail="Eklenecek soru listesi boş")

    # Fetch default topic if topic_id is missing
    default_topic_id = body.topic_id
    if not default_topic_id and body.subject_id:
        t_res = await db.execute(select(M.Topic.id).where(M.Topic.subject_id == body.subject_id).limit(1))
        default_topic_id = t_res.scalar()

    if not default_topic_id:
        # Fallback to any topic for this exam
        t_res = await db.execute(select(M.Topic.id).where(M.Topic.exam_id == body.exam_id).limit(1))
        default_topic_id = t_res.scalar()

    added = 0
    for item in body.questions:
        q_text = item.get("question_text") or item.get("text") or item.get("soru")
        if not q_text:
            continue

        subj_id = item.get("subject_id") or body.subject_id
        top_id = item.get("topic_id") or default_topic_id

        # Resolve subject / topic if IDs are missing
        if not subj_id and top_id:
            t_obj_res = await db.execute(select(M.Topic.subject_id).where(M.Topic.id == top_id))
            subj_id = t_obj_res.scalar()

        if not subj_id or not top_id:
            continue

        q_record = M.Question(
            id=str(uuid.uuid4()),
            exam_id=body.exam_id,
            subject_id=subj_id,
            topic_id=top_id,
            subtopic_id=item.get("subtopic_id"),
            question_text=q_text,
            option_a=str(item.get("option_a") or item.get("a") or item.get("A") or ""),
            option_b=str(item.get("option_b") or item.get("b") or item.get("B") or ""),
            option_c=str(item.get("option_c") or item.get("c") or item.get("C") or ""),
            option_d=str(item.get("option_d") or item.get("d") or item.get("D") or ""),
            option_e=str(item.get("option_e") or item.get("e") or item.get("E") or ""),
            correct_answer=str(item.get("correct_answer") or item.get("cevap") or "A").upper().strip(),
            explanation=str(item.get("explanation") or item.get("cozum") or ""),
            difficulty=str(item.get("difficulty") or "orta"),
            source=str(item.get("source") or "Toplu Yükleme"),
            year=int(item.get("year") or 2024),
            tags=item.get("tags") or ["Toplu Yükleme"],
            status="active",
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        db.add(q_record)
        added += 1

    await db.commit()
    return {"ok": True, "count": added}


@api.post("/admin/questions/extract-pdf")
async def admin_extract_pdf_questions(
    file: UploadFile = File(...),
    exam_id: str = Form(...),
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    from pdf_extractor import extract_questions_from_pdf
    pdf_bytes = await file.read()

    exam_res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam_obj = exam_res.scalars().first()
    exam_name = exam_obj.name if exam_obj else "YKS"

    subjs_res = await db.execute(select(M.Subject).where(M.Subject.exam_id == exam_id))
    subjects = [s.to_dict() for s in subjs_res.scalars().all()]

    questions = await extract_questions_from_pdf(pdf_bytes, exam_name=exam_name, available_subjects=subjects)
    return {"ok": True, "questions": questions, "total_extracted": len(questions)}


class CategorizedBulkIn(BaseModel):
    exam_id: str
    questions: List[Dict[str, Any]]


@api.post("/admin/questions/bulk-import-categorized")
async def admin_bulk_import_categorized(
    body: CategorizedBulkIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    subjs_res = await db.execute(select(M.Subject).where(M.Subject.exam_id == body.exam_id))
    subjs = {s.name.lower(): s for s in subjs_res.scalars().all()}

    topics_res = await db.execute(select(M.Topic).where(M.Topic.exam_id == body.exam_id))
    all_topics = list(topics_res.scalars().all())

    added = 0
    for item in body.questions:
        q_text = item.get("question_text")
        if not q_text:
            continue

        subj_name = item.get("subject_name", "").strip()
        matched_subj = subjs.get(subj_name.lower())
        if not matched_subj:
            for s in subjs.values():
                if s.name.lower() in subj_name.lower() or subj_name.lower() in s.name.lower():
                    matched_subj = s
                    break
        if not matched_subj and subjs:
            matched_subj = list(subjs.values())[0]

        if not matched_subj:
            continue

        # Match topic
        topic_name = item.get("topic_name", "").strip()
        matched_topic = None
        for t in all_topics:
            if t.subject_id == matched_subj.id and (t.name.lower() in topic_name.lower() or topic_name.lower() in t.name.lower()):
                matched_topic = t
                break

        if not matched_topic:
            subj_topics = [t for t in all_topics if t.subject_id == matched_subj.id]
            if subj_topics:
                matched_topic = subj_topics[0]
            else:
                matched_topic = M.Topic(
                    id=str(uuid.uuid4()),
                    exam_id=body.exam_id,
                    subject_id=matched_subj.id,
                    name=topic_name or "Genel Konu",
                    order=0,
                    status="active",
                    created_at=now_iso(),
                )
                db.add(matched_topic)
                await db.flush()
                all_topics.append(matched_topic)

        q_record = M.Question(
            id=str(uuid.uuid4()),
            exam_id=body.exam_id,
            subject_id=matched_subj.id,
            topic_id=matched_topic.id,
            question_text=q_text,
            option_a=str(item.get("option_a") or ""),
            option_b=str(item.get("option_b") or ""),
            option_c=str(item.get("option_c") or ""),
            option_d=str(item.get("option_d") or ""),
            option_e=str(item.get("option_e") or ""),
            correct_answer=str(item.get("correct_answer") or "A").upper().strip()[:1],
            explanation=str(item.get("explanation") or ""),
            difficulty=str(item.get("difficulty") or "orta"),
            source=str(item.get("source") or "PDF Kitapçık"),
            year=int(item.get("year") or 2024),
            tags=item.get("tags") or [item.get("source") or "PDF Soru"],
            status="active",
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        db.add(q_record)
        added += 1

    await db.commit()
    return {"ok": True, "count": added}


class AdminAiQuestionGenIn(BaseModel):
    exam_id: str
    subject_id: str
    topic_id: str
    subtopic_id: Optional[str] = None
    count: int = 5
    difficulty: str = "orta"
    style: str = "standard"
    custom_instructions: Optional[str] = None


@api.post("/admin/questions/ai-generate")
async def admin_ai_generate_questions(
    body: AdminAiQuestionGenIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin paneli için sınav, ders, konu ve alt konuya özel özgün soru üretir ve kaydeder."""
    # 1. Bilgileri doğrula ve isimleri al
    e_res = await db.execute(select(M.Exam).where(M.Exam.id == body.exam_id))
    exam = e_res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")

    s_res = await db.execute(select(M.Subject).where(M.Subject.id == body.subject_id))
    subject = s_res.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    t_res = await db.execute(select(M.Topic).where(M.Topic.id == body.topic_id))
    topic = t_res.scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")

    subtopic_name = None
    if body.subtopic_id:
        st_res = await db.execute(select(M.Subtopic).where(M.Subtopic.id == body.subtopic_id))
        subtopic = st_res.scalars().first()
        if subtopic:
            subtopic_name = subtopic.name

    # 2. Mevcut soru örneklerini al (tekrar etmemesi için)
    sample_res = await db.execute(
        select(M.Question.question_text)
        .where(M.Question.topic_id == body.topic_id)
        .limit(6)
    )
    existing_samples = [r[0] for r in sample_res.all() if r[0]]

    # 3. İstenen sayıyı parti parti üret (Maksimum parti boyutu 10)
    target_count = max(1, min(100, body.count))
    generated_all: List[Dict[str, Any]] = []

    remaining = target_count
    while remaining > 0:
        batch_size = min(10, remaining)
        try:
            batch = await AICoach.generate_custom_questions_ai(
                exam_name=exam.name,
                subject_name=subject.name,
                topic_name=topic.name,
                subtopic_name=subtopic_name,
                count=batch_size,
                difficulty=body.difficulty,
                style=body.style,
                custom_instructions=body.custom_instructions,
                existing_samples=existing_samples + [q.get("question_text", "") for q in generated_all],
            )
            if batch and isinstance(batch, list):
                generated_all.extend(batch)
                remaining -= len(batch)
            else:
                break
        except Exception as ex:
            logger.error(f"Error during AI question generation batch: {ex}")
            if not generated_all:
                raise HTTPException(status_code=500, detail=f"Soru üretimi başarısız: {ex}")
            break

    # 4. Soruları veritabanına kaydet
    saved_questions = []
    now_str = now_iso()

    for item in generated_all:
        q_text = item.get("question_text", "").strip()
        if not q_text:
            continue

        q_id = str(uuid.uuid4())
        diff = item.get("difficulty", body.difficulty).lower()
        if diff not in ["kolay", "orta", "zor"]:
            diff = body.difficulty if body.difficulty in ["kolay", "orta", "zor"] else "orta"

        tags = [exam.name.lower(), subject.name.lower(), "ai-özgün-soru"]
        if subtopic_name:
            tags.append(subtopic_name.lower())

        q_record = M.Question(
            id=q_id,
            exam_id=body.exam_id,
            subject_id=body.subject_id,
            topic_id=body.topic_id,
            subtopic_id=body.subtopic_id,
            question_text=q_text,
            option_a=str(item.get("option_a") or ""),
            option_b=str(item.get("option_b") or ""),
            option_c=str(item.get("option_c") or ""),
            option_d=str(item.get("option_d") or ""),
            option_e=str(item.get("option_e") or ""),
            correct_answer=str(item.get("correct_answer") or "A").upper().strip()[:1],
            explanation=str(item.get("explanation") or ""),
            difficulty=diff,
            source="AI Özgün Soru Üretici",
            year=2026,
            tags=tags,
            status="active",
            created_at=now_str,
            updated_at=now_str,
        )
        db.add(q_record)
        saved_questions.append(q_record)

    await db.commit()

    return {
        "ok": True,
        "created_count": len(saved_questions),
        "questions": [q.to_dict() for q in saved_questions],
    }




@api.delete("/admin/questions/{question_id}")
async def admin_delete_question(
    question_id: str,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(M.Question).where(M.Question.id == question_id))
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")
    await db.delete(q)
    await db.commit()
    return {"ok": True}


class AutoGenTestIn(BaseModel):
    exam_id: str
    name: str
    description: str = ""
    duration_minutes: int = 120
    difficulty: str = "orta"
    target_count: Optional[int] = None
    subject_counts: Optional[Dict[str, int]] = None


@api.post("/admin/tests/auto-generate")
async def admin_auto_generate_test(
    body: AutoGenTestIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rastgele / Dengeli Soru Seçerek Otomatik Deneme Sınavı Oluşturucu:
    Sınavın derslerine göre veya verilen soru sayılarına göre havuzdan soru seçer.
    """
    exam_res = await db.execute(select(M.Exam).where(M.Exam.id == body.exam_id))
    exam = exam_res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")

    # Get subjects for this exam
    subj_res = await db.execute(select(M.Subject).where(M.Subject.exam_id == body.exam_id).order_by(M.Subject.order))
    subjects = subj_res.scalars().all()

    selected_question_ids = []
    breakdown = {}

    if body.subject_counts:
        # Custom distribution by subject ID or subject name
        for s in subjects:
            count = body.subject_counts.get(s.id) or body.subject_counts.get(s.name) or 0
            if count <= 0:
                continue
            q_res = await db.execute(select(M.Question.id).where(M.Question.subject_id == s.id))
            q_ids = [row[0] for row in q_res.all()]
            chosen = random.sample(q_ids, min(len(q_ids), count))
            selected_question_ids.extend(chosen)
            breakdown[s.name] = len(chosen)
    else:
        # Balanced distribution across all subjects of this exam
        total_target = body.target_count or (120 if "TYT" in exam.name else 80 if "AYT" in exam.name else 60)
        per_subj = max(1, total_target // max(1, len(subjects)))

        for s in subjects:
            q_res = await db.execute(select(M.Question.id).where(M.Question.subject_id == s.id))
            q_ids = [row[0] for row in q_res.all()]
            chosen = random.sample(q_ids, min(len(q_ids), per_subj))
            selected_question_ids.extend(chosen)
            breakdown[s.name] = len(chosen)

    # Fallback if no questions matched subjects, pick general from exam
    if not selected_question_ids:
        all_q_res = await db.execute(select(M.Question.id).where(M.Question.exam_id == body.exam_id).limit(40))
        selected_question_ids = [row[0] for row in all_q_res.all()]
        breakdown["Genel"] = len(selected_question_ids)

    if not selected_question_ids:
        raise HTTPException(status_code=400, detail="Bu sınav için soru havuzunda yeterli soru bulunamadı. Lütfen önce soru yükleyin.")

    test_obj = M.Test(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        name=body.name,
        description=body.description or f"{exam.name} otomatik oluşturulan deneme sınavı ({len(selected_question_ids)} soru)",
        duration_minutes=body.duration_minutes,
        question_ids=selected_question_ids,
        difficulty=body.difficulty,
        status="published",
        created_at=now_iso(),
    )
    db.add(test_obj)
    await db.commit()

    return {
        "ok": True,
        "test": test_obj.to_dict(),
        "question_count": len(selected_question_ids),
        "breakdown": breakdown,
    }


@api.post("/admin/tests")
async def admin_create_test(body: TestIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    test_obj = M.Test(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        name=body.name,
        description=body.description,
        duration_minutes=body.duration_minutes,
        question_ids=body.question_ids,
        difficulty=body.difficulty,
        status=body.status,
        created_at=now_iso(),
    )
    db.add(test_obj)
    await db.commit()
    return test_obj.to_dict()



class NoteIn(BaseModel):
    title: str
    description: str = ""
    exam_id: str
    subject_id: str
    topic_id: str
    content: str = ""
    video_url: str = ""
    file_path: Optional[str] = None
    file_name: Optional[str] = None


@api.post("/admin/notes")
async def admin_create_note(body: NoteIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    note_obj = M.StudyNote(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        exam_id=body.exam_id,
        subject_id=body.subject_id,
        topic_id=body.topic_id,
        content=body.content,
        video_url=body.video_url,
        file_path=body.file_path,
        file_name=body.file_name,
        status="published",
        published_at=now_iso(),
        created_at=now_iso(),
    )
    db.add(note_obj)
    await db.commit()
    return note_obj.to_dict()


@api.put("/admin/exams/{exam_id}/scoring")
async def admin_save_scoring(exam_id: str, config: dict, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam = res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    exam.scoring_config = config
    await db.commit()
    return {"ok": True}


class ExamDateUpdateIn(BaseModel):
    exam_date: Optional[str] = None

@api.put("/admin/exams/{exam_id}/date")
async def admin_update_exam_date(exam_id: str, body: ExamDateUpdateIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.Exam).where(M.Exam.id == exam_id))
    exam = res.scalars().first()
    if not exam:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    exam.exam_date = body.exam_date
    await db.commit()
    return exam.to_dict()


# ===========================================================================
# KREDI SİSTEMİ (AI Credits)
# ===========================================================================

CREDIT_COSTS = {
    "ai_snap": 3,        # Fotoğraflı soru çözümü (Vision AI — pahalı)
    "ai_chat": 1,        # AI Koç mesajı
    "ai_flashcard": 1,   # Flashcard üretimi
}

async def deduct_credit(user_id: str, action: str, db: AsyncSession) -> dict:
    """Kullanıcıdan kredi düş, yetersizse HTTPException fırlat."""
    cost = CREDIT_COSTS.get(action, 1)
    res = await db.execute(select(M.User).where(M.User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    current = user.ai_credits if user.ai_credits is not None else 0
    if current < cost:
        raise HTTPException(status_code=402, detail=f"Yetersiz kredi. Bu işlem {cost} kredi gerektiriyor. Mevcut: {current}")
    user.ai_credits = current - cost
    balance_after = user.ai_credits
    tx = M.CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=-cost,
        type=action,
        description={"ai_snap": "Fotoğraflı Soru Çözümü", "ai_chat": "AI Koç Mesajı", "ai_flashcard": "AI Flashcard"}.get(action, action),
        balance_after=balance_after,
        created_at=now_iso(),
    )
    db.add(tx)
    await db.commit()
    return {"credits_used": cost, "balance": balance_after}


@api.get("/credits/balance")
async def get_credit_balance(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """Anlık kredi bakiyesi"""
    res = await db.execute(select(M.User).where(M.User.id == user["id"]))
    u = res.scalars().first()
    return {"balance": u.ai_credits if u and u.ai_credits is not None else 0}


@api.get("/credits/history")
async def get_credit_history(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """Son 50 kredi hareketi"""
    res = await db.execute(
        select(M.CreditTransaction)
        .where(M.CreditTransaction.user_id == user["id"])
        .order_by(desc(M.CreditTransaction.created_at))
        .limit(50)
    )
    txs = res.scalars().all()
    return [t.to_dict() for t in txs]


class AdminGrantCreditIn(BaseModel):
    user_id: str
    amount: int
    description: Optional[str] = "Admin Tarafından Yüklendi"

@api.post("/admin/credits/grant")
async def admin_grant_credits(body: AdminGrantCreditIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    """Admin kullanıcıya manuel kredi yükler"""
    res = await db.execute(select(M.User).where(M.User.id == body.user_id))
    u = res.scalars().first()
    if not u:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    u.ai_credits = (u.ai_credits or 0) + body.amount
    tx = M.CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=body.user_id,
        amount=body.amount,
        type="admin_grant",
        description=body.description,
        balance_after=u.ai_credits,
        created_at=now_iso(),
    )
    db.add(tx)
    await db.commit()
    return {"ok": True, "new_balance": u.ai_credits}


# Kredi paket tanımları (demo — production'da Stripe/iyzico webhook'u buraya bağlanır)
CREDIT_PACKAGES = [
    {"id": "starter",   "name": "Hızlı Başlangıç",      "credits": 200,  "price_tl": 99,  "badge": None,       "popular": False},
    {"id": "marathon",  "name": "Sınav Maratonu",        "credits": 600,  "price_tl": 249, "badge": "Popüler",  "popular": True},
    {"id": "super",     "name": "Süper Derece Paketi",   "credits": 1500, "price_tl": 499, "badge": "En İyi",   "popular": False},
    {"id": "unlimited", "name": "Sınırsız Pro Abonelik", "credits": -1,   "price_tl": 349, "badge": "Aylık",    "popular": False},
]

@api.get("/credits/packages")
async def list_credit_packages():
    return CREDIT_PACKAGES


@api.post("/credits/purchase")
async def purchase_credits(body: dict, user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """
    Demo: Gerçek ödeme sistemi (iyzico/Stripe) entegre edilecek.
    Şimdilik paket ID ile anında kredi yükleme (test amaçlı).
    """
    pkg_id = body.get("package_id")
    pkg = next((p for p in CREDIT_PACKAGES if p["id"] == pkg_id), None)
    if not pkg:
        raise HTTPException(status_code=400, detail="Geçersiz paket")
    if pkg["credits"] == -1:
        raise HTTPException(status_code=400, detail="Sınırsız paket için ödeme sistemi entegrasyonu gereklidir.")
    res = await db.execute(select(M.User).where(M.User.id == user["id"]))
    u = res.scalars().first()
    u.ai_credits = (u.ai_credits or 0) + pkg["credits"]
    tx = M.CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=user["id"],
        amount=pkg["credits"],
        type="purchase",
        description=f"{pkg['name']} — {pkg['credits']} Kredi Satın Alındı",
        balance_after=u.ai_credits,
        created_at=now_iso(),
    )
    db.add(tx)
    await db.commit()
    return {"ok": True, "credits_added": pkg["credits"], "new_balance": u.ai_credits}


# ===========================================================================
# ADMIN — API KEY YÖNETİMİ
# ===========================================================================

def _mask_key(key: str) -> str:
    if not key or len(key) <= 10:
        return "••••••••"
    return f"{key[:6]}...••••...{key[-4:]}"

class ApiKeyIn(BaseModel):
    provider: str
    name: str
    key_value: str
    priority: int = 1

class ApiKeyPatch(BaseModel):
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    name: Optional[str] = None

@api.get("/admin/api-keys")
async def list_api_keys(admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.ApiKey).order_by(M.ApiKey.provider, M.ApiKey.priority))
    return [k.to_dict() for k in res.scalars().all()]

@api.post("/admin/api-keys")
async def create_api_key(body: ApiKeyIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    key_obj = M.ApiKey(
        id=str(uuid.uuid4()),
        provider=body.provider,
        name=body.name,
        key_value=body.key_value,
        masked_key=_mask_key(body.key_value),
        is_active=True,
        priority=body.priority,
        created_at=now_iso(),
    )
    db.add(key_obj)
    await db.commit()
    # Reload ai key manager with new DB keys
    try:
        from ai import key_manager
        import os
        # Append new key to in-memory pool
        from ai import KeyEntry
        entry = KeyEntry(body.key_value, body.provider)
        if body.provider not in key_manager.pools:
            key_manager.pools[body.provider] = []
        key_manager.pools[body.provider].append(entry)
        logger.info(f"Runtime: Added API key [{body.provider} - {_mask_key(body.key_value)}] to key manager")
    except Exception as e:
        logger.warning(f"Could not hot-reload key manager: {e}")
    return key_obj.to_dict()

@api.patch("/admin/api-keys/{key_id}")
async def patch_api_key(key_id: str, body: ApiKeyPatch, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.ApiKey).where(M.ApiKey.id == key_id))
    k = res.scalars().first()
    if not k:
        raise HTTPException(status_code=404, detail="Anahtar bulunamadı")
    if body.is_active is not None:
        k.is_active = body.is_active
    if body.priority is not None:
        k.priority = body.priority
    if body.name is not None:
        k.name = body.name
    await db.commit()
    return k.to_dict()

@api.delete("/admin/api-keys/{key_id}")
async def delete_api_key(key_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.ApiKey).where(M.ApiKey.id == key_id))
    k = res.scalars().first()
    if not k:
        raise HTTPException(status_code=404, detail="Anahtar bulunamadı")
    await db.delete(k)
    await db.commit()
    return {"ok": True}

@api.get("/admin/api-keys/status")
async def api_key_live_status(admin: dict = Depends(admin_user)):
    """ai.py key manager'dan canlı durumu döndür"""
    from ai import key_manager
    return key_manager.get_status_summary()


# ─── Admin: Toplu Soru Üretimi ────────────────────────────────────────────────
_question_gen_task: asyncio.Task = None
_question_gen_status = {"running": False, "done": 0, "failed": 0, "total": 0, "started_at": None, "log": []}

class QuestionBulkGenIn(BaseModel):
    exam_id: Optional[str] = None
    count_per_subtopic: int = 5
    difficulty: str = "orta"
    style: str = "standard"

async def _run_bulk_question_generation(exam_id: Optional[str], count_per_subtopic: int, difficulty: str, style: str):
    global _question_gen_status
    _question_gen_status["running"] = True
    _question_gen_status["started_at"] = now_iso()
    _question_gen_status["log"] = ["🚀 Toplu soru üretimi başladı..."]
    _question_gen_status["done"] = 0
    _question_gen_status["failed"] = 0
    _question_gen_status["total"] = 0

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(M.Subtopic, M.Topic, M.Subject, M.Exam).join(
                M.Topic, M.Subtopic.topic_id == M.Topic.id
            ).join(
                M.Subject, M.Topic.subject_id == M.Subject.id
            ).join(
                M.Exam, M.Subject.exam_id == M.Exam.id
            )
            if exam_id:
                stmt = stmt.where(M.Exam.id == exam_id)
            
            res = await session.execute(stmt)
            rows = res.all()
            
            _question_gen_status["total"] = len(rows)
            _question_gen_status["log"].append(f"🔍 Toplam {len(rows)} alt konu bulundu. Soru üretimi başlatılıyor...")
            
            for idx, (subt, topic, subj, exam_obj) in enumerate(rows):
                if not _question_gen_status["running"]:
                    _question_gen_status["log"].append("⛔ Üretim durduruldu.")
                    break
                
                _question_gen_status["log"].append(
                    f"⏳ ({idx+1}/{len(rows)}) {exam_obj.name} -> {subj.name} -> {topic.name} -> {subt.name}..."
                )
                
                # Fetch samples
                sample_res = await session.execute(
                    select(M.Question.question_text)
                    .where(M.Question.subtopic_id == subt.id)
                    .limit(5)
                )
                existing_samples = sample_res.scalars().all()
                
                try:
                    questions = await AICoach.generate_custom_questions_ai(
                        exam_name=exam_obj.name,
                        subject_name=subj.name,
                        topic_name=topic.name,
                        subtopic_name=subt.name,
                        count=count_per_subtopic,
                        difficulty=difficulty,
                        style=style,
                        existing_samples=existing_samples
                    )
                    
                    for q_data in questions:
                        q_obj = M.Question(
                            id=str(uuid.uuid4()),
                            exam_id=exam_obj.id,
                            subject_id=subj.id,
                            topic_id=topic.id,
                            subtopic_id=subt.id,
                            question_text=q_data.get("question_text", "Soru"),
                            option_a=q_data.get("option_a", ""),
                            option_b=q_data.get("option_b", ""),
                            option_c=q_data.get("option_c", ""),
                            option_d=q_data.get("option_d", ""),
                            option_e=q_data.get("option_e", ""),
                            correct_answer=q_data.get("correct_answer", "A"),
                            difficulty=q_data.get("difficulty", difficulty),
                            explanation=q_data.get("explanation", ""),
                            status="published",
                            created_at=now_iso(),
                        )
                        session.add(q_obj)
                    
                    await session.commit()
                    _question_gen_status["done"] += 1
                    _question_gen_status["log"].append(f"✅ Başarılı: {subt.name} için {len(questions)} soru eklendi.")
                except Exception as e:
                    _question_gen_status["failed"] += 1
                    _question_gen_status["log"].append(f"❌ Hata: {subt.name} ({e})")
                    logger.error(f"Error generating questions for subtopic {subt.id}: {e}")
                
                await asyncio.sleep(0.5)

            _question_gen_status["log"].append("🎉 Toplu soru üretimi tamamlandı.")
    except Exception as e:
        _question_gen_status["log"].append(f"❌ Kritik hata: {e}")
        logger.error(f"Bulk question generation critical error: {e}")
    finally:
        _question_gen_status["running"] = False

@api.post("/admin/generate-questions")
async def start_question_generation(body: QuestionBulkGenIn, admin: dict = Depends(admin_user)):
    global _question_gen_task, _question_gen_status
    if _question_gen_status.get("running"):
        return {"ok": False, "message": "Toplu soru üretimi zaten devam ediyor.", "status": _question_gen_status}
    
    _question_gen_status = {
        "running": True, "done": 0, "failed": 0, "total": 0,
        "started_at": now_iso(), "log": ["🚀 Başlatılıyor..."],
    }
    
    _question_gen_task = asyncio.create_task(
        _run_bulk_question_generation(
            exam_id=body.exam_id,
            count_per_subtopic=body.count_per_subtopic,
            difficulty=body.difficulty,
            style=body.style,
        )
    )
    return {"ok": True, "status": _question_gen_status}

@api.get("/admin/generate-questions/status")
async def question_generation_status(admin: dict = Depends(admin_user)):
    return _question_gen_status

@api.delete("/admin/generate-questions/cancel")
async def cancel_question_generation(admin: dict = Depends(admin_user)):
    global _question_gen_task, _question_gen_status
    if _question_gen_task and not _question_gen_task.done():
        _question_gen_task.cancel()
        _question_gen_status["running"] = False
        _question_gen_status["log"].append("⛔ Admin tarafından durduruldu.")
        return {"ok": True}
    return {"ok": False, "message": "Devam eden bir işlem yok."}


# ─── Admin: Otomatik İçerik Üretimi ──────────────────────────────────────────

_content_gen_task: asyncio.Task = None
_content_gen_status = {"running": False, "done": 0, "failed": 0, "total": 0, "started_at": None, "log": []}


class ContentGenIn(BaseModel):
    exam_filter: Optional[str] = None
    subject_filter: Optional[str] = None
    limit: Optional[int] = None
    concurrency: int = 10


async def _run_content_generation(exam_filter, subject_filter, limit, concurrency):
    """Arkaplanda generate_content.py'ı import ederek çalıştır."""
    global _content_gen_status
    try:
        from generate_content import ParallelGenerator
        _content_gen_status["running"] = True
        _content_gen_status["started_at"] = now_iso()
        _content_gen_status["log"] = ["🚀 İçerik üretimi başladı..."]

        gen = ParallelGenerator(concurrency=concurrency, dry_run=False)

        # Orijinal _process_one'u sarmala ve sayaçları güncelle
        original_process = gen._process_one

        async def tracked_process(pool, row):
            await original_process(pool, row)
            _content_gen_status["done"] = gen.n_success + gen.n_skipped
            _content_gen_status["failed"] = gen.n_failed
            _content_gen_status["total"] = gen.n_total

        gen._process_one = tracked_process

        await gen.run(exam_filter=exam_filter, subject_filter=subject_filter, limit=limit)

        _content_gen_status["log"].append(
            f"✅ Tamamlandı: {gen.n_success} üretildi, {gen.n_skipped} zaten vardı, {gen.n_failed} başarısız."
        )
    except Exception as e:
        _content_gen_status["log"].append(f"❌ Kritik hata: {e}")
        logger.error(f"Content generation error: {e}")
    finally:
        _content_gen_status["running"] = False


@api.post("/admin/generate-content")
async def start_content_generation(
    body: ContentGenIn,
    admin: dict = Depends(admin_user),
    background_tasks=None,
):
    """Admin panelinden içerik üretimini başlat (arkaplanda çalışır)."""
    global _content_gen_task, _content_gen_status

    if _content_gen_status.get("running"):
        return {"ok": False, "message": "İçerik üretimi zaten devam ediyor.", "status": _content_gen_status}

    _content_gen_status = {
        "running": True, "done": 0, "failed": 0, "total": 0,
        "started_at": now_iso(), "log": ["🚀 Başlatılıyor..."],
    }

    _content_gen_task = asyncio.create_task(
        _run_content_generation(
            exam_filter=body.exam_filter,
            subject_filter=body.subject_filter,
            limit=body.limit,
            concurrency=body.concurrency,
        )
    )

    return {"ok": True, "message": "İçerik üretimi arkaplanda başlatıldı.", "status": _content_gen_status}


class CurriculumGenIn(BaseModel):
    exam_name: str
    description: Optional[str] = ""
    category: str = "diger"

@api.post("/admin/generate-curriculum")
async def admin_generate_curriculum(
    body: CurriculumGenIn,
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db)
):
    from ai import key_manager
    import httpx
    import json
    
    prompt = f"""Sen profesyonel bir eğitim müfredatı uzmanısın. "{body.exam_name}" sınavı ({body.description}) için kapsamlı dersler, konular ve alt konular içeren bir müfredat planı hazırla.
    Tüm dersleri, ana konuları ve alt konuları eksiksiz şekilde listele. 

    ÇIKTIYI YALNIZCA AŞAĞIDAKİ JSON ŞABLONUNDA DÖNDÜR:
    {{
      "subjects": [
        {{
          "name": "Ders Adı (Örn: Matematik)",
          "slug": "matematik" veya "turkce" veya "fen" veya "sosyal" veya "general" (renk teması için),
          "topics": [
            {{
              "name": "Konu Adı (Örn: Üslü Sayılar)",
              "subtopics": ["Alt Konu 1", "Alt Konu 2", "Alt Konu 3"]
            }}
          ]
        }}
      ]
    }}
    """
    
    key = key_manager.get_active_key("gemini")
    text_content = ""
    if key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.5,
                    "responseMimeType": "application/json"
                }
            }
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                text_content = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning(f"Curriculum Gemini generation failed: {e}")

    if not text_content:
        openai_key = key_manager.get_active_key("openai")
        if openai_key:
            try:
                headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "Sen müfredat hazırlama uzmanısın. Yalnızca geçerli JSON döndür."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.5,
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient(timeout=60) as client:
                    r = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                    r.raise_for_status()
                    text_content = r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"Curriculum OpenAI generation failed: {e}")

    if not text_content:
        raise HTTPException(status_code=500, detail="Müfredat üretmek için geçerli bir AI anahtarı bulunamadı veya API hatası oluştu.")
        
    try:
        data = json.loads(text_content)
        exam_id = str(uuid.uuid4())
        exam_obj = M.Exam(
            id=exam_id,
            name=body.exam_name,
            description=body.description,
            exam_type=body.exam_name.lower(),
            category=body.category,
            status="published",
            order=0,
            created_at=now_iso(),
        )
        db.add(exam_obj)
        
        subjects = data.get("subjects", [])
        for idx_s, s in enumerate(subjects):
            subj_id = str(uuid.uuid4())
            subj_obj = M.Subject(
                id=subj_id,
                exam_id=exam_id,
                name=s.get("name", "Ders"),
                slug=s.get("slug", "general"),
                order=idx_s,
                status="active",
                created_at=now_iso(),
            )
            db.add(subj_obj)
            
            topics = s.get("topics", [])
            for idx_t, t in enumerate(topics):
                topic_id = str(uuid.uuid4())
                topic_obj = M.Topic(
                    id=topic_id,
                    exam_id=exam_id,
                    subject_id=subj_id,
                    name=t.get("name", "Konu"),
                    order=idx_t,
                    status="active",
                    created_at=now_iso(),
                )
                db.add(topic_obj)
                
                subtopics = t.get("subtopics", [])
                for idx_st, st in enumerate(subtopics):
                    subtopic_obj = M.Subtopic(
                        id=str(uuid.uuid4()),
                        topic_id=topic_id,
                        name=st,
                        order=idx_st,
                        created_at=now_iso(),
                    )
                    db.add(subtopic_obj)
        
        await db.commit()
        return {"ok": True, "exam_id": exam_id, "curriculum": data}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Müfredat parse/kaydetme hatası: {e}")


@api.get("/admin/generate-content/status")

async def content_generation_status(admin: dict = Depends(admin_user)):
    """İçerik üretiminin anlık durumunu döndür."""
    return _content_gen_status


@api.delete("/admin/generate-content/cancel")
async def cancel_content_generation(admin: dict = Depends(admin_user)):
    """Devam eden içerik üretimini durdur."""
    global _content_gen_task, _content_gen_status
    if _content_gen_task and not _content_gen_task.done():
        _content_gen_task.cancel()
        _content_gen_status["running"] = False
        _content_gen_status["log"].append("⛔ Admin tarafından durduruldu.")
        return {"ok": True, "message": "İçerik üretimi durduruldu."}
    return {"ok": False, "message": "Devam eden bir işlem yok."}


@api.post("/admin/upload")
async def upload_file(

    file: UploadFile = File(...),
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    filename = f"{uuid.uuid4()}.{ext}"
    data = await file.read()
    content_type = file.content_type or S.MIME_TYPES.get(ext, "application/octet-stream")
    result = S.put_object(filename, data, content_type)
    url_path = f"/uploads/{filename}"

    record = M.FileRecord(
        id=str(uuid.uuid4()),
        storage_path=url_path,
        original_filename=file.filename,
        content_type=content_type,
        size=result.get("size", len(data)),
        is_deleted=False,
        created_at=now_iso(),
    )
    db.add(record)
    await db.commit()
    return {
        "url": url_path,
        "path": url_path,
        "filename": filename,
        "name": file.filename,
        "size": len(data),
        "content_type": content_type,
    }


@api.get("/admin/ai-status")
async def admin_ai_status(admin: dict = Depends(admin_user)):
    """Return masked status summary of all configured AI providers and keys for maximum privacy."""
    return AICoach.key_manager.get_status_summary()


@api.post("/admin/ai-reload")
async def admin_ai_reload(admin: dict = Depends(admin_user)):
    """Reload AI keys from environment dynamically without restarting the server."""
    AICoach.key_manager.reload_keys()
    return {"ok": True, "summary": AICoach.key_manager.get_status_summary()}


# ─── BLOG POST ENDPOINTS ──────────────────────────────────────────────────────
class BlogPostIn(BaseModel):
    title: str
    summary: str
    content: str
    image_url: Optional[str] = None
    category: str = "Genel"
    seo_keywords: Optional[str] = ""
    status: str = "published"

@api.get("/blog")
async def list_blog_posts(
    category: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(M.BlogPost).where(M.BlogPost.status == "published")
    if category:
        stmt = stmt.where(M.BlogPost.category == category)
    stmt = stmt.order_by(desc(M.BlogPost.created_at)).limit(limit)
    res = await db.execute(stmt)
    return [p.to_dict() for p in res.scalars().all()]

@api.get("/blog/{slug}")
async def get_blog_post(slug: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.BlogPost).where(M.BlogPost.slug == slug))
    post = res.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")
    
    post.views = (post.views or 0) + 1
    await db.commit()
    return post.to_dict()

@api.post("/admin/blog")
async def admin_create_blog(body: BlogPostIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    from auto_blog import generate_slug
    now_str = now_iso()
    slug_base = generate_slug(body.title)
    slug = slug_base
    existing = await db.execute(select(M.BlogPost).where(M.BlogPost.slug == slug))
    if existing.scalars().first():
        slug = f"{slug_base}-{str(uuid.uuid4())[:6]}"

    post = M.BlogPost(
        id=str(uuid.uuid4()),
        title=body.title,
        slug=slug,
        summary=body.summary,
        content=body.content,
        image_url=body.image_url or "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop",
        category=body.category,
        seo_keywords=body.seo_keywords,
        author="Admin",
        status=body.status,
        views=0,
        created_at=now_str,
        updated_at=now_str,
    )
    db.add(post)
    await db.commit()
    return post.to_dict()

@api.put("/admin/blog/{post_id}")
async def admin_update_blog(post_id: str, body: BlogPostIn, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.BlogPost).where(M.BlogPost.id == post_id))
    post = res.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")
    
    post.title = body.title
    post.summary = body.summary
    post.content = body.content
    if body.image_url:
        post.image_url = body.image_url
    post.category = body.category
    post.seo_keywords = body.seo_keywords
    post.status = body.status
    post.updated_at = now_iso()
    
    await db.commit()
    return post.to_dict()

@api.delete("/admin/blog/{post_id}")
async def admin_delete_blog(post_id: str, admin: dict = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(M.BlogPost).where(M.BlogPost.id == post_id))
    post = res.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")
    await db.delete(post)
    await db.commit()
    return {"ok": True}

@api.post("/admin/blog/trigger-auto")
async def admin_trigger_auto_blog(admin: dict = Depends(admin_user)):
    """AI Otomatik haber tarayıcıyı anında tetikler ve yeni blog yazısını ekler."""
    from auto_blog import write_auto_blog
    post = await write_auto_blog()
    if not post:
        raise HTTPException(status_code=500, detail="Otomatik blog yazısı üretilemedi.")
    return {"ok": True, "post": post}

class DeptArticleGenRequest(BaseModel):
    score_types: Optional[list[str]] = ["SAY", "EA", "SÖZ", "DİL", "TYT"]
    skip_existing: Optional[bool] = True

@api.get("/admin/blog/department-catalog")
async def admin_get_department_catalog(admin: dict = Depends(admin_user)):
    """Bölüm rehberi kataloğunu ve puan türü dağılımlarını döndürür."""
    from auto_blog import DEPARTMENT_GUIDE_CATALOG
    total_depts = sum(len(v) for v in DEPARTMENT_GUIDE_CATALOG.values())
    return {
        "catalog": DEPARTMENT_GUIDE_CATALOG,
        "total_departments": total_depts
    }

@api.post("/admin/blog/generate-department-articles")
async def admin_start_department_articles_generation(
    body: DeptArticleGenRequest,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(admin_user)
):
    """Tüm bölümler için arka planda toplu SEO makalesi üretme işlemini başlatır."""
    from auto_blog import DEPT_GEN_STATUS, run_bulk_department_articles_generation
    if DEPT_GEN_STATUS.get("running"):
        return {
            "ok": False,
            "message": "Toplu makale üretimi zaten çalışıyor.",
            "status": DEPT_GEN_STATUS
        }

    background_tasks.add_task(
        run_bulk_department_articles_generation,
        score_types=body.score_types,
        skip_existing=body.skip_existing
    )
    return {
        "ok": True,
        "message": "Toplu SEO Bölüm Makalesi üretimi arka planda başlatıldı."
    }

@api.get("/admin/blog/generate-department-articles/status")
async def admin_get_department_articles_status(admin: dict = Depends(admin_user)):
    """Toplu makale üretiminin anlık ilerleme durumunu ve loglarını döndürür."""
    from auto_blog import DEPT_GEN_STATUS
    return DEPT_GEN_STATUS

@api.delete("/admin/blog/generate-department-articles/cancel")
async def admin_cancel_department_articles_generation(admin: dict = Depends(admin_user)):
    """Çalışan toplu makale üretimini iptal eder."""
    from auto_blog import DEPT_GEN_STATUS
    DEPT_GEN_STATUS["cancel"] = True
    return {"ok": True, "message": "İptal talebi gönderildi."}



app.include_router(api)


# Mount /uploads for static files
S.init_storage()
app.mount("/uploads", StaticFiles(directory=S.UPLOAD_DIR), name="uploads")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_models()
    S.init_storage()
    async with AsyncSessionLocal() as session:
        await A.seed_admin(session)
        exams_count = (await session.execute(select(func.count()).select_from(M.Exam))).scalar() or 0
        if exams_count < 10:
            from seed_master_osym_curriculum import seed_master_curriculum
            await seed_master_curriculum()
    logger.info("Startup complete: MySQL schema initialized & Master OSYM Curriculum verified")





@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
