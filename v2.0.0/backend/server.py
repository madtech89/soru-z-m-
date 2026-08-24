from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import secrets
import csv
import io
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form, Header
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import select, update, delete, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

from database import engine, AsyncSessionLocal, get_db, init_models
import models as M
import auth as A
import storage as S
import ai as AICoach
from seed import seed_content, seed_extras, now_iso

app = FastAPI(title="Netor Sınav Hazırlık Platformu API v2")
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
        created_at=now_str,
        updated_at=now_str,
    )
    db.add(user_obj)
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

    return result_doc.to_dict()


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
@api.get("/tercih/programs")
async def list_university_programs(
    score_type: Optional[str] = None,
    city: Optional[str] = None,
    university: Optional[str] = None,
    search: Optional[str] = None,
    user_score: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(M.UniversityProgram).where(M.UniversityProgram.status == "active")
    if score_type:
        stmt = stmt.where(M.UniversityProgram.score_type == score_type)
    if city:
        stmt = stmt.where(M.UniversityProgram.city == city)
    if university:
        stmt = stmt.where(M.UniversityProgram.university == university)
    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                M.UniversityProgram.program.ilike(search_filter),
                M.UniversityProgram.university.ilike(search_filter),
                M.UniversityProgram.faculty.ilike(search_filter),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    order_stmt = stmt.order_by(desc(M.UniversityProgram.score_2025)).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(order_stmt)
    items = res.scalars().all()

    # Categorize programs relative to user score if provided
    result_items = []
    for p in items:
        d = p.to_dict()
        if user_score is not None:
            p_score = p.score_2025 or 0.0
            if user_score >= p_score:
                d["recommendation_category"] = "guaranteed"
            elif user_score >= p_score - 15:
                d["recommendation_category"] = "likely"
            else:
                d["recommendation_category"] = "reach"
        result_items.append(d)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": result_items,
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
@api.get("/user/dashboard")
async def user_dashboard(user: dict = Depends(current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()

    today_ans_stmt = select(func.count()).select_from(M.UserAnswer).where(
        and_(M.UserAnswer.user_id == uid, M.UserAnswer.created_at >= today_start)
    )
    today_solved = (await db.execute(today_ans_stmt)).scalar() or 0

    all_ans_res = await db.execute(
        select(M.UserAnswer.is_correct, M.UserAnswer.topic_id, M.UserAnswer.created_at)
        .where(M.UserAnswer.user_id == uid)
    )
    all_answers = all_ans_res.all()

    total_answers = len(all_answers)
    correct_answers = sum(1 for a in all_answers if a.is_correct)
    overall_success = round((correct_answers / max(1, total_answers)) * 100, 1)

    daily_stats = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_str = day_date.strftime("%Y-%m-%d")
        count = sum(1 for a in all_answers if a.created_at.startswith(day_str))
        daily_stats.append({
            "day": day_date.strftime("%a"),
            "date": day_str,
            "count": count,
        })

    results_res = await db.execute(
        select(M.UserTestResult)
        .where(M.UserTestResult.user_id == uid)
        .order_by(desc(M.UserTestResult.created_at))
        .limit(5)
    )
    recent_results = [r.to_dict() for r in results_res.scalars().all()]

    return {
        "today_solved": today_solved,
        "daily_goal": user.get("daily_goal", 20),
        "total_solved": total_answers,
        "overall_success": overall_success,
        "xp": user.get("xp", 0),
        "streak": user.get("streak", 0),
        "level": user.get("level", 1),
        "daily_stats": daily_stats,
        "recent_results": recent_results,
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
    return {
        "users": (await db.execute(select(func.count()).select_from(M.User).where(M.User.role == "user"))).scalar() or 0,
        "exams": (await db.execute(select(func.count()).select_from(M.Exam))).scalar() or 0,
        "questions": (await db.execute(select(func.count()).select_from(M.Question))).scalar() or 0,
        "tests": (await db.execute(select(func.count()).select_from(M.Test))).scalar() or 0,
        "answers": (await db.execute(select(func.count()).select_from(M.UserAnswer))).scalar() or 0,
        "results": (await db.execute(select(func.count()).select_from(M.UserTestResult))).scalar() or 0,
        "programs": (await db.execute(select(func.count()).select_from(M.UniversityProgram))).scalar() or 0,
    }


@api.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    admin: dict = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    path = f"uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    content_type = file.content_type or S.MIME_TYPES.get(ext, "application/octet-stream")
    result = S.put_object(path, data, content_type)

    record = M.FileRecord(
        id=str(uuid.uuid4()),
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=content_type,
        size=result.get("size", len(data)),
        is_deleted=False,
        created_at=now_iso(),
    )
    db.add(record)
    await db.commit()
@api.get("/admin/ai-status")
async def admin_ai_status(admin: dict = Depends(admin_user)):
    """Return masked status summary of all configured AI providers and keys for maximum privacy."""
    return AICoach.key_manager.get_status_summary()


@api.post("/admin/ai-reload")
async def admin_ai_reload(admin: dict = Depends(admin_user)):
    """Reload AI keys from environment dynamically without restarting the server."""
    AICoach.key_manager.reload_keys()
    return {"ok": True, "summary": AICoach.key_manager.get_status_summary()}


app.include_router(api)


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
        await seed_content(session)
        await seed_extras(session)
    logger.info("Startup complete: MySQL schema initialized, admin + content seeded")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
