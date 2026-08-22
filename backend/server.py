from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
import uuid
import secrets
import io
import csv

import auth as A
import storage as S
import ai as AICoach
from seed import seed_content, seed_extras, now_iso

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Sınav Hazırlık Platformu API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sinav")


# ---------- Dependencies ----------
async def current_user(request: Request):
    return await A.get_current_user_from_db(request, db)


async def admin_user(request: Request):
    user = await A.get_current_user_from_db(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


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
    target_exams: Optional[List[str]] = None
    target_score: Optional[int] = None
    daily_goal: Optional[int] = None


class ExamIn(BaseModel):
    name: str
    description: str = ""
    exam_type: str = "general"
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
    answers: List[AnswerItem]


class PracticeAnswerIn(BaseModel):
    question_id: str
    selected_answer: Optional[str] = None
    time_spent: int = 0


# ============ AUTH ============
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    doc = {
        "email": email,
        "password_hash": A.hash_password(body.password),
        "name": body.name,
        "username": email.split("@")[0],
        "role": "user",
        "avatar": "",
        "target_exams": [],
        "target_score": None,
        "daily_goal": 20,
        "xp": 0,
        "streak": 0,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = A.create_access_token(uid, email)
    refresh = A.create_refresh_token(uid)
    A.set_auth_cookies(response, access, refresh)
    doc["_id"] = res.inserted_id
    return {"user": A.public_user(doc), "token": access}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response, request: Request):
    email = body.email.lower()
    ident = email
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Çok fazla deneme. 15 dakika sonra tekrar deneyin.")
    user = await db.users.find_one({"email": email})
    if not user or not A.verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1},
             "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    access = A.create_access_token(uid, email)
    refresh = A.create_refresh_token(uid)
    A.set_auth_cookies(response, access, refresh)
    return {"user": A.public_user(user), "token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": A.public_user(user)}


@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)),
            "used": False,
        })
        logger.info(f"Şifre sıfırlama linki: {os.environ.get('FRONTEND_URL')}/reset-password?token={token}")
    return {"ok": True, "message": "Kayıtlıysa sıfırlama bağlantısı gönderildi"}


@api.post("/auth/reset-password")
async def reset(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış bağlantı")
    from bson import ObjectId
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": A.hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return {"user": A.public_user(fresh)}


# ============ EXAMS ============
@api.get("/exams")
async def list_exams():
    exams = await db.exams.find({"status": "active"}, {"_id": 0}).sort("order", 1).to_list(200)
    return exams


@api.post("/admin/exams")
async def create_exam(body: ExamIn, admin: dict = Depends(admin_user)):
    count = await db.exams.count_documents({})
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "order": count, "created_at": now_iso()}
    await db.exams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/exams/{exam_id}")
async def update_exam(exam_id: str, body: ExamIn, admin: dict = Depends(admin_user)):
    await db.exams.update_one({"id": exam_id}, {"$set": body.model_dump()})
    return await db.exams.find_one({"id": exam_id}, {"_id": 0})


@api.delete("/admin/exams/{exam_id}")
async def delete_exam(exam_id: str, admin: dict = Depends(admin_user)):
    await db.exams.delete_one({"id": exam_id})
    return {"ok": True}


# ============ SUBJECTS / TOPICS ============
@api.get("/exams/{exam_id}/subjects")
async def exam_subjects(exam_id: str):
    subs = await db.subjects.find({"exam_id": exam_id, "status": "active"}, {"_id": 0}).sort("order", 1).to_list(200)
    return subs


@api.get("/exams/{exam_id}/topics")
async def exam_topics(exam_id: str, subject_id: Optional[str] = None):
    q = {"exam_id": exam_id, "status": "active"}
    if subject_id:
        q["subject_id"] = subject_id
    topics = await db.topics.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return topics


@api.post("/admin/subjects")
async def create_subject(body: SubjectIn, admin: dict = Depends(admin_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "status": "active", "created_at": now_iso()}
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/admin/topics")
async def create_topic(body: TopicIn, admin: dict = Depends(admin_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "status": "active", "created_at": now_iso()}
    await db.topics.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============ QUESTIONS (question bank) ============
def strip_question(q, reveal=False):
    base = {k: q[k] for k in ["id", "exam_id", "subject_id", "topic_id", "question_text",
                              "option_a", "option_b", "option_c", "option_d", "option_e",
                              "difficulty", "source", "year", "tags"] if k in q}
    if reveal:
        base["correct_answer"] = q.get("correct_answer")
        base["explanation"] = q.get("explanation")
    return base


@api.get("/questions")
async def list_questions(
    user: dict = Depends(current_user),
    exam_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),  # solved/unsolved
    result_filter: Optional[str] = None,  # correct/wrong/blank
    page: int = 1,
    page_size: int = 12,
):
    q = {"status": "active"}
    if exam_id:
        q["exam_id"] = exam_id
    if subject_id:
        q["subject_id"] = subject_id
    if topic_id:
        q["topic_id"] = topic_id
    if difficulty:
        q["difficulty"] = difficulty

    uid = str(user["_id"])
    # user answer history for filtering by status/result
    if status_filter or result_filter:
        ans = await db.user_answers.find({"user_id": uid}, {"question_id": 1, "is_correct": 1, "is_blank": 1, "_id": 0}).to_list(100000)
        answered_ids = {a["question_id"] for a in ans}
        latest = {}
        for a in ans:
            latest[a["question_id"]] = a
        if status_filter == "solved":
            q["id"] = {"$in": list(answered_ids)}
        elif status_filter == "unsolved":
            q["id"] = {"$nin": list(answered_ids)}
        if result_filter == "wrong":
            ids = [k for k, v in latest.items() if not v["is_correct"] and not v["is_blank"]]
            q["id"] = {"$in": ids}
        elif result_filter == "correct":
            ids = [k for k, v in latest.items() if v["is_correct"]]
            q["id"] = {"$in": ids}
        elif result_filter == "blank":
            ids = [k for k, v in latest.items() if v["is_blank"]]
            q["id"] = {"$in": ids}

    total = await db.questions.count_documents(q)
    page = max(1, page)
    cursor = db.questions.find(q).skip((page - 1) * page_size).limit(page_size)
    items = [strip_question(doc) for doc in await cursor.to_list(page_size)]
    return {
        "items": items, "total": total, "page": page, "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@api.post("/practice/answer")
async def practice_answer(body: PracticeAnswerIn, user: dict = Depends(current_user)):
    q = await db.questions.find_one({"id": body.question_id})
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")
    is_blank = body.selected_answer is None
    is_correct = (not is_blank) and body.selected_answer == q["correct_answer"]
    await db.user_answers.insert_one({
        "id": str(uuid.uuid4()), "user_id": str(user["_id"]), "question_id": q["id"],
        "exam_id": q["exam_id"], "subject_id": q["subject_id"], "topic_id": q["topic_id"],
        "selected_answer": body.selected_answer, "correct_answer": q["correct_answer"],
        "is_correct": is_correct, "is_blank": is_blank, "time_spent": body.time_spent,
        "exam_session_id": None, "created_at": now_iso(),
    })
    if is_correct:
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"xp": 10}})
    return {"is_correct": is_correct, "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", "")}


@api.post("/admin/questions")
async def create_question(body: QuestionIn, admin: dict = Depends(admin_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "question_type": "multiple_choice",
           "status": "active", "created_at": now_iso(), "updated_at": now_iso()}
    await db.questions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/admin/questions/bulk")
async def bulk_questions(items: List[QuestionIn], admin: dict = Depends(admin_user)):
    docs = []
    for body in items:
        docs.append({"id": str(uuid.uuid4()), **body.model_dump(), "question_type": "multiple_choice",
                     "status": "active", "created_at": now_iso(), "updated_at": now_iso()})
    if docs:
        await db.questions.insert_many(docs)
    return {"inserted": len(docs)}


# ============ TESTS / DENEMELER ============
@api.get("/tests")
async def list_tests(exam_id: Optional[str] = None):
    q = {"status": "published"}
    if exam_id:
        q["exam_id"] = exam_id
    tests = await db.tests.find(q, {"_id": 0}).to_list(200)
    for t in tests:
        t["question_count"] = len(t.get("question_ids", []))
    return tests


@api.get("/tests/{test_id}")
async def get_test(test_id: str, user: dict = Depends(current_user)):
    t = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")
    qs = await db.questions.find({"id": {"$in": t["question_ids"]}}).to_list(1000)
    order = {qid: i for i, qid in enumerate(t["question_ids"])}
    qs.sort(key=lambda x: order.get(x["id"], 0))
    t["questions"] = [strip_question(q) for q in qs]
    return t


@api.post("/tests/{test_id}/start")
async def start_test(test_id: str, user: dict = Depends(current_user)):
    t = await db.tests.find_one({"id": test_id})
    if not t:
        raise HTTPException(status_code=404, detail="Deneme bulunamadı")
    session = {
        "id": str(uuid.uuid4()), "user_id": str(user["_id"]), "test_id": test_id,
        "exam_id": t["exam_id"], "started_at": now_iso(), "status": "in_progress",
    }
    await db.test_sessions.insert_one(session)
    session.pop("_id", None)
    return session


@api.post("/sessions/{session_id}/submit")
async def submit_session(session_id: str, body: SubmitIn, user: dict = Depends(current_user)):
    session = await db.test_sessions.find_one({"id": session_id})
    if not session or session["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    test = await db.tests.find_one({"id": session["test_id"]})
    qmap = {q["id"]: q for q in await db.questions.find(
        {"id": {"$in": test["question_ids"]}}).to_list(1000)}

    correct = wrong = blank = 0
    answer_docs = []
    for a in body.answers:
        q = qmap.get(a.question_id)
        if not q:
            continue
        is_blank = a.selected_answer is None
        is_correct = (not is_blank) and a.selected_answer == q["correct_answer"]
        if is_correct:
            correct += 1
        elif is_blank:
            blank += 1
        else:
            wrong += 1
        answer_docs.append({
            "id": str(uuid.uuid4()), "user_id": str(user["_id"]), "question_id": q["id"],
            "exam_id": q["exam_id"], "subject_id": q["subject_id"], "topic_id": q["topic_id"],
            "selected_answer": a.selected_answer, "correct_answer": q["correct_answer"],
            "is_correct": is_correct, "is_blank": is_blank, "time_spent": a.time_spent,
            "exam_session_id": session_id, "created_at": now_iso(),
        })
    if answer_docs:
        await db.user_answers.insert_many(answer_docs)

    total = len(test["question_ids"])
    net = round(correct - wrong / 4, 2)
    score = round((net / total) * 500, 1) if total else 0
    success_rate = round((correct / (correct + wrong)) * 100, 1) if (correct + wrong) else 0

    result = {
        "id": str(uuid.uuid4()), "user_id": str(user["_id"]), "session_id": session_id,
        "test_id": test["id"], "test_name": test["name"], "exam_id": test["exam_id"],
        "total": total, "correct": correct, "wrong": wrong, "blank": blank,
        "net": net, "score": score, "success_rate": success_rate,
        "created_at": now_iso(),
    }
    await db.user_test_results.insert_one(dict(result))
    await db.test_sessions.update_one({"id": session_id},
                                      {"$set": {"status": "completed", "completed_at": now_iso()}})
    await db.users.update_one({"_id": user["_id"]},
                              {"$inc": {"xp": correct * 10}})
    result.pop("_id", None)
    return result


@api.get("/results")
async def list_results(user: dict = Depends(current_user)):
    rows = await db.user_test_results.find(
        {"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return rows


# ============ ANALYTICS ============
async def topic_proficiency(uid, exam_id=None):
    match = {"user_id": uid}
    if exam_id:
        match["exam_id"] = exam_id
    answers = await db.user_answers.find(match, {"_id": 0}).to_list(100000)
    by_topic = {}
    for a in answers:
        t = a["topic_id"]
        d = by_topic.setdefault(t, {"correct": 0, "wrong": 0, "blank": 0, "time": 0, "n": 0})
        d["n"] += 1
        d["time"] += a.get("time_spent", 0)
        if a["is_correct"]:
            d["correct"] += 1
        elif a["is_blank"]:
            d["blank"] += 1
        else:
            d["wrong"] += 1
    # enrich with topic + subject names
    topic_ids = list(by_topic.keys())
    topics = await db.topics.find({"id": {"$in": topic_ids}}, {"_id": 0}).to_list(1000)
    tmap = {t["id"]: t for t in topics}
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(1000)
    smap = {s["id"]: s for s in subjects}
    out = []
    for tid, d in by_topic.items():
        answered = d["correct"] + d["wrong"]
        acc = (d["correct"] / answered * 100) if answered else 0
        proficiency = round(acc)
        if proficiency >= 70:
            status = "İyi"
        elif proficiency >= 45:
            status = "Geliştirilmeli"
        else:
            status = "Kritik Eksik"
        topic = tmap.get(tid, {})
        subj = smap.get(topic.get("subject_id"), {})
        out.append({
            "topic_id": tid, "topic_name": topic.get("name", "Bilinmeyen"),
            "subject_id": topic.get("subject_id"), "subject_name": subj.get("name", ""),
            "subject_slug": subj.get("slug", "general"), "exam_id": topic.get("exam_id"),
            "proficiency": proficiency, "status": status,
            "solved": d["n"], "correct": d["correct"], "wrong": d["wrong"],
            "blank": d["blank"], "avg_time": round(d["time"] / d["n"], 1) if d["n"] else 0,
        })
    out.sort(key=lambda x: x["proficiency"])
    return out


@api.get("/topics/proficiency")
async def get_proficiency(user: dict = Depends(current_user), exam_id: Optional[str] = None):
    return await topic_proficiency(str(user["_id"]), exam_id)


@api.get("/dashboard")
async def dashboard(user: dict = Depends(current_user)):
    uid = str(user["_id"])
    all_answers = await db.user_answers.find({"user_id": uid}, {"_id": 0}).to_list(100000)
    today = datetime.now(timezone.utc).date()

    def parse(a):
        try:
            return datetime.fromisoformat(a["created_at"]).date()
        except Exception:
            return today

    today_ans = [a for a in all_answers if parse(a) == today]
    solved_today = len(today_ans)
    correct_today = sum(1 for a in today_ans if a["is_correct"])
    answered_today = sum(1 for a in today_ans if not a["is_blank"])
    success_today = round(correct_today / answered_today * 100, 1) if answered_today else 0

    total_correct = sum(1 for a in all_answers if a["is_correct"])
    total_answered = sum(1 for a in all_answers if not a["is_blank"])
    overall_success = round(total_correct / total_answered * 100, 1) if total_answered else 0

    # last 7 days series
    series = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_ans = [a for a in all_answers if parse(a) == day]
        ans_nb = sum(1 for a in day_ans if not a["is_blank"])
        cor = sum(1 for a in day_ans if a["is_correct"])
        series.append({
            "date": day.strftime("%d.%m"),
            "solved": len(day_ans),
            "success": round(cor / ans_nb * 100, 1) if ans_nb else 0,
        })

    results = await db.user_test_results.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    last_result = results[0] if results else None
    avg_score = round(sum(r["score"] for r in results) / len(results), 1) if results else 0

    prof = await topic_proficiency(uid)
    weak = [p for p in prof if p["proficiency"] < 60][:5]
    strong = sorted([p for p in prof if p["proficiency"] >= 70],
                    key=lambda x: -x["proficiency"])[:5]

    # recommended tests from target exam
    target = user.get("target_exams") or []
    tq = {"status": "published"}
    if target:
        tq["exam_id"] = {"$in": target}
    rec_tests = await db.tests.find(tq, {"_id": 0}).limit(3).to_list(3)
    for t in rec_tests:
        t["question_count"] = len(t.get("question_ids", []))

    return {
        "daily_goal": user.get("daily_goal", 20),
        "solved_today": solved_today,
        "success_today": success_today,
        "overall_success": overall_success,
        "total_solved": len(all_answers),
        "total_tests": len(results),
        "avg_score": avg_score,
        "last_result": last_result,
        "series": series,
        "weak_topics": weak,
        "strong_topics": strong,
        "recommended_tests": rec_tests,
        "xp": user.get("xp", 0),
        "streak": user.get("streak", 0),
    }


@api.get("/leaderboard")
async def leaderboard(period: str = "all", exam_id: Optional[str] = None, metric: str = "score"):
    now = datetime.now(timezone.utc)
    start = None
    if period == "daily":
        start = now - timedelta(days=1)
    elif period == "weekly":
        start = now - timedelta(days=7)
    elif period == "monthly":
        start = now - timedelta(days=30)

    match = {}
    if exam_id:
        match["exam_id"] = exam_id
    results = await db.user_test_results.find(match, {"_id": 0}).to_list(100000)
    if start:
        results = [r for r in results if _after(r["created_at"], start)]

    agg = {}
    for r in results:
        d = agg.setdefault(r["user_id"], {"score": 0, "tests": 0, "correct": 0, "best": 0})
        d["score"] += r["score"]
        d["best"] = max(d["best"], r["score"])
        d["tests"] += 1
        d["correct"] += r["correct"]

    from bson import ObjectId
    rows = []
    for uid, d in agg.items():
        try:
            u = await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            u = None
        if not u:
            continue
        avg = round(d["score"] / d["tests"], 1) if d["tests"] else 0
        rows.append({
            "user_id": uid, "name": u.get("name", "Öğrenci"),
            "username": u.get("username", ""), "avatar": u.get("avatar", ""),
            "avg_score": avg, "best_score": d["best"], "tests": d["tests"],
            "total_correct": d["correct"], "xp": u.get("xp", 0),
        })
    key = {"score": "avg_score", "questions": "total_correct", "xp": "xp"}.get(metric, "avg_score")
    rows.sort(key=lambda x: -x[key])
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows[:50]


def _after(iso_str, dt):
    try:
        return datetime.fromisoformat(iso_str) >= dt
    except Exception:
        return True


# ============ STUDY NOTES ============
class NoteIn(BaseModel):
    title: str
    description: str = ""
    exam_id: str
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    content: str = ""
    video_url: str = ""
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    status: str = "published"


@api.get("/notes")
async def list_notes(user: dict = Depends(current_user), exam_id: Optional[str] = None,
                     subject_id: Optional[str] = None, topic_id: Optional[str] = None):
    q = {"status": "published"}
    if exam_id:
        q["exam_id"] = exam_id
    if subject_id:
        q["subject_id"] = subject_id
    if topic_id:
        q["topic_id"] = topic_id
    notes = await db.study_notes.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)
    return notes


@api.get("/notes/{note_id}")
async def get_note(note_id: str, user: dict = Depends(current_user)):
    n = await db.study_notes.find_one({"id": note_id}, {"_id": 0})
    if not n:
        raise HTTPException(status_code=404, detail="Ders notu bulunamadı")
    return n


@api.get("/topics/{topic_id}/note")
async def topic_note(topic_id: str, user: dict = Depends(current_user)):
    n = await db.study_notes.find_one({"topic_id": topic_id, "status": "published"}, {"_id": 0})
    return n or {}


@api.post("/admin/notes")
async def create_note(body: NoteIn, admin: dict = Depends(admin_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "published_at": now_iso(), "created_at": now_iso()}
    await db.study_notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/notes/{note_id}")
async def update_note(note_id: str, body: NoteIn, admin: dict = Depends(admin_user)):
    await db.study_notes.update_one({"id": note_id}, {"$set": body.model_dump()})
    return await db.study_notes.find_one({"id": note_id}, {"_id": 0})


@api.delete("/admin/notes/{note_id}")
async def delete_note(note_id: str, admin: dict = Depends(admin_user)):
    await db.study_notes.delete_one({"id": note_id})
    return {"ok": True}


# ============ FILE UPLOAD / STORAGE ============
@api.post("/admin/upload")
async def upload_file(file: UploadFile = File(...), admin: dict = Depends(admin_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    path = f"{S.APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    content_type = file.content_type or S.MIME_TYPES.get(ext, "application/octet-stream")
    result = S.put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"],
        "original_filename": file.filename, "content_type": content_type,
        "size": result.get("size", len(data)), "is_deleted": False,
        "created_at": now_iso(),
    })
    return {"path": result["path"], "name": file.filename, "content_type": content_type}


@api.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    data, ct = S.get_object(path)
    return Response(content=data, media_type=record.get("content_type", ct))


# ============ BULK CSV IMPORT ============
@api.post("/admin/questions/import-csv")
async def import_csv(file: UploadFile = File(...), admin: dict = Depends(admin_user)):
    raw = (await file.read()).decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    required = ["exam", "subject", "topic", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer"]

    exams = {e["name"].strip().lower(): e for e in await db.exams.find({}, {"_id": 0}).to_list(500)}
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(2000)
    topics = await db.topics.find({}, {"_id": 0}).to_list(5000)
    existing_q = {q["question_text"].strip().lower() for q in await db.questions.find({}, {"question_text": 1, "_id": 0}).to_list(100000)}

    inserted, errors, duplicates = 0, [], 0
    docs = []
    for i, row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        missing = [c for c in required if not row.get(c)]
        if missing:
            errors.append({"row": i, "reason": f"Eksik alan: {', '.join(missing)}"})
            continue
        exam = exams.get(row["exam"].lower())
        if not exam:
            errors.append({"row": i, "reason": f"Sınav bulunamadı: {row['exam']}"})
            continue
        subj = next((s for s in subjects if s["exam_id"] == exam["id"] and s["name"].strip().lower() == row["subject"].lower()), None)
        if not subj:
            errors.append({"row": i, "reason": f"Ders bulunamadı: {row['subject']}"})
            continue
        topic = next((t for t in topics if t["subject_id"] == subj["id"] and t["name"].strip().lower() == row["topic"].lower()), None)
        if not topic:
            errors.append({"row": i, "reason": f"Konu bulunamadı: {row['topic']}"})
            continue
        if row["correct_answer"].upper() not in ["A", "B", "C", "D", "E"]:
            errors.append({"row": i, "reason": "Geçersiz cevap anahtarı"})
            continue
        if row["question"].lower() in existing_q:
            duplicates += 1
            continue
        existing_q.add(row["question"].lower())
        docs.append({
            "id": str(uuid.uuid4()), "exam_id": exam["id"], "subject_id": subj["id"],
            "topic_id": topic["id"], "subtopic_id": None, "question_text": row["question"],
            "question_type": "multiple_choice",
            "option_a": row["option_a"], "option_b": row["option_b"], "option_c": row["option_c"],
            "option_d": row["option_d"], "option_e": row.get("option_e", ""),
            "correct_answer": row["correct_answer"].upper(), "explanation": row.get("explanation", ""),
            "difficulty": row.get("difficulty", "orta") or "orta", "source": "CSV Import",
            "year": None, "tags": [subj["name"], topic["name"]], "status": "active",
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        inserted += 1
    if docs:
        await db.questions.insert_many(docs)
    total = inserted + duplicates + len(errors)
    return {"total": total, "inserted": inserted, "duplicates": duplicates,
            "error_count": len(errors), "errors": errors[:50]}


# ============ SCORING (per-exam configurable) ============
class ScoringSection(BaseModel):
    name: str
    question_count: int = 0
    wrong_penalty: float = 0.25   # kaç yanlış 1 doğruyu götürür => 1/penalty
    coefficient: float = 1.0


class ScoringConfig(BaseModel):
    sections: List[ScoringSection]
    base_score: float = 100.0
    multiplier: float = 1.0
    score_type: str = "Ağırlıklı Puan"


class CalcSection(BaseModel):
    name: str
    correct: int = 0
    wrong: int = 0
    blank: int = 0


class CalcIn(BaseModel):
    exam_id: str
    sections: List[CalcSection]


@api.get("/exams/{exam_id}/scoring")
async def get_scoring(exam_id: str):
    e = await db.exams.find_one({"id": exam_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    cfg = e.get("scoring_config")
    if cfg and cfg.get("sections"):
        return cfg
    subs = await db.subjects.find({"exam_id": exam_id}).sort("order", 1).to_list(100)
    return {
        "sections": [{"name": s["name"], "question_count": 20, "wrong_penalty": 0.25, "coefficient": 1.0} for s in subs],
        "base_score": 100.0, "multiplier": 1.0, "score_type": "Ham Puan",
    }


@api.put("/admin/exams/{exam_id}/scoring")
async def set_scoring(exam_id: str, body: ScoringConfig, admin: dict = Depends(admin_user)):
    await db.exams.update_one({"id": exam_id}, {"$set": {"scoring_config": body.model_dump()}})
    return {"ok": True, "scoring_config": body.model_dump()}


@api.post("/score/calculate")
async def calculate_score(body: CalcIn, user: dict = Depends(current_user)):
    e = await db.exams.find_one({"id": body.exam_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Sınav bulunamadı")
    cfg = e.get("scoring_config") or {"sections": [], "base_score": 100.0, "multiplier": 1.0, "score_type": "Ham Puan"}
    cfg_secs = {s["name"]: s for s in cfg.get("sections", [])}
    breakdown = []
    weighted = 0.0
    total_net = 0.0
    for sec in body.sections:
        conf = cfg_secs.get(sec.name, {"wrong_penalty": 0.25, "coefficient": 1.0})
        penalty = conf.get("wrong_penalty", 0.25)
        coef = conf.get("coefficient", 1.0)
        net = round(sec.correct - sec.wrong * penalty, 2)
        total_net += net
        weighted += net * coef
        breakdown.append({"name": sec.name, "net": net, "coefficient": coef,
                          "correct": sec.correct, "wrong": sec.wrong, "blank": sec.blank})
    score = round(cfg.get("base_score", 100.0) + weighted * cfg.get("multiplier", 1.0), 2)
    return {"score": score, "total_net": round(total_net, 2), "score_type": cfg.get("score_type", "Ham Puan"),
            "breakdown": breakdown}


# ============ AI COACH (LLM) ============
@api.post("/ai/coach")
async def ai_coach(user: dict = Depends(current_user)):
    uid = str(user["_id"])
    prof = await topic_proficiency(uid)
    results = await db.user_test_results.find({"user_id": uid}, {"_id": 0}).to_list(200)
    avg_score = round(sum(r["score"] for r in results) / len(results), 1) if results else 0
    all_ans = await db.user_answers.count_documents({"user_id": uid})
    corr = await db.user_answers.count_documents({"user_id": uid, "is_correct": True})
    ans_nb = await db.user_answers.count_documents({"user_id": uid, "is_blank": False})
    overall = round(corr / ans_nb * 100, 1) if ans_nb else 0
    weak = [f"{p['topic_name']} (%{p['proficiency']})" for p in prof if p["status"] != "İyi"][:5]
    strong = [f"{p['topic_name']} (%{p['proficiency']})" for p in prof if p["status"] == "İyi"][:5]

    target_exam = ""
    if user.get("target_exams"):
        te = await db.exams.find_one({"id": user["target_exams"][0]}, {"_id": 0})
        target_exam = te["name"] if te else ""

    context = {
        "user_id": uid, "target_exam": target_exam, "target_score": user.get("target_score"),
        "avg_score": avg_score, "daily_goal": user.get("daily_goal", 20),
        "total_solved": all_ans, "overall_success": overall, "weak": weak, "strong": strong,
    }
    try:
        result = await AICoach.generate_coach(context)
    except Exception as ex:
        logger.error(f"AI coach error: {ex}")
        raise HTTPException(status_code=502, detail="AI önerisi şu an üretilemedi, lütfen tekrar deneyin.")

    rec = {"id": str(uuid.uuid4()), "user_id": uid, "result": result, "created_at": now_iso()}
    await db.ai_recommendations.insert_one(dict(rec))
    rec.pop("_id", None)
    return rec


@api.get("/ai/coach/latest")
async def ai_coach_latest(user: dict = Depends(current_user)):
    rec = await db.ai_recommendations.find_one(
        {"user_id": str(user["_id"])}, {"_id": 0}, sort=[("created_at", -1)])
    return rec or {}


# ============ ADMIN ANALYTICS ============
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(admin_user)):
    return {
        "users": await db.users.count_documents({"role": "user"}),
        "exams": await db.exams.count_documents({}),
        "questions": await db.questions.count_documents({}),
        "tests": await db.tests.count_documents({}),
        "answers": await db.user_answers.count_documents({}),
        "results": await db.user_test_results.count_documents({}),
    }


@api.get("/admin/users")
async def admin_users(admin: dict = Depends(admin_user)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return [A.public_user({**u}) for u in users]


@api.get("/")
async def root():
    return {"message": "Sınav Hazırlık Platformu API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.questions.create_index([("exam_id", 1), ("subject_id", 1), ("topic_id", 1)])
    await db.user_answers.create_index([("user_id", 1), ("topic_id", 1)])
    await db.user_answers.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_test_results.create_index([("user_id", 1)])
    await A.seed_admin(db)
    await seed_content(db)
    await seed_extras(db)
    try:
        S.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    logger.info("Startup complete: admin + content seeded")


@app.on_event("shutdown")
async def shutdown():
    client.close()
