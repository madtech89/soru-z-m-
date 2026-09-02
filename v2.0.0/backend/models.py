from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, ForeignKey, Index
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    username = Column(String(100), default="", nullable=False)
    role = Column(String(50), default="user", nullable=False)
    avatar = Column(String(500), default="", nullable=False)
    phone = Column(String(50), default="")
    kvkk_consent = Column(Boolean, default=False)
    marketing_consent = Column(Boolean, default=False)
    consent_date = Column(String(50), nullable=True)
    level = Column(Integer, default=1)
    placement_completed = Column(Boolean, default=False)
    target_exams = Column(JSON, default=list)
    target_score = Column(Float, nullable=True)
    daily_goal = Column(Integer, default=20)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    plan = Column(String(50), default="free")
    plan_expires_at = Column(String(50), nullable=True)
    ai_credits = Column(Integer, default=100)
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "_id": self.id,
            "email": self.email,
            "name": self.name,
            "username": self.username,
            "role": self.role,
            "avatar": self.avatar or "",
            "phone": self.phone or "",
            "kvkk_consent": self.kvkk_consent or False,
            "marketing_consent": self.marketing_consent or False,
            "consent_date": self.consent_date,
            "level": self.level or 1,
            "placement_completed": self.placement_completed or False,
            "target_exams": self.target_exams or [],
            "target_score": self.target_score,
            "daily_goal": self.daily_goal or 20,
            "xp": self.xp or 0,
            "streak": self.streak or 0,
            "plan": self.plan or "free",
            "plan_expires_at": self.plan_expires_at,
            "ai_credits": self.ai_credits if self.ai_credits is not None else 100,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }



class CreditTransaction(Base):
    """Kredi hareketleri: kullanım ve satın alma"""
    __tablename__ = "credit_transactions"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)          # pozitif = ekleme, negatif = kullanım
    type = Column(String(50), nullable=False)         # "welcome_bonus" | "ai_snap" | "ai_chat" | "ai_flashcard" | "purchase" | "admin_grant"
    description = Column(String(255), nullable=True)
    balance_after = Column(Integer, nullable=False)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "type": self.type,
            "description": self.description,
            "balance_after": self.balance_after,
            "created_at": self.created_at,
        }


class ApiKey(Base):
    """Admin tarafından yönetilen AI API anahtarları"""
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True)
    provider = Column(String(50), nullable=False, index=True)  # gemini, openai, deepseek, groq, anthropic
    name = Column(String(100), nullable=False)          # kullanıcı dostu etiket
    key_value = Column(String(500), nullable=False)     # gerçek key (production'da şifreli saklanmalı)
    masked_key = Column(String(100), nullable=False)    # UI'da gösterilecek
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)               # düşük = önce dene
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "name": self.name,
            "masked_key": self.masked_key,
            "is_active": self.is_active,
            "priority": self.priority,
            "created_at": self.created_at,
        }


class AIGenerationJob(Base):
    """Hostinger kuyruk sistemi için AI soru üretim görev tablosu"""
    __tablename__ = "ai_generation_jobs"

    id = Column(String(36), primary_key=True)
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, failed, retry, cancelled
    provider = Column(String(50), nullable=True)
    api_key_id = Column(String(36), nullable=True)              # Hangi key ile çalıştı
    model = Column(String(100), nullable=True)
    
    exam_id = Column(String(36), nullable=True)
    exam_name = Column(String(100), nullable=True)
    subject_id = Column(String(36), nullable=True)
    subject_name = Column(String(100), nullable=True)
    topic_id = Column(String(36), nullable=True)
    topic_name = Column(String(100), nullable=True)
    subtopic_id = Column(String(36), nullable=True)
    subtopic_name = Column(String(100), nullable=True)
    
    target_count = Column(Integer, default=5)
    difficulty = Column(String(50), default="orta")
    style = Column(String(50), default="standard")
    
    attempt_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    http_status = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    response_time = Column(Float, nullable=True)
    
    created_at = Column(String(50), nullable=False)
    started_at = Column(String(50), nullable=True)
    completed_at = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "provider": self.provider,
            "model": self.model,
            "exam_name": self.exam_name,
            "subject_name": self.subject_name,
            "topic_name": self.topic_name,
            "subtopic_name": self.subtopic_name,
            "target_count": self.target_count,
            "attempt_count": self.attempt_count,
            "http_status": self.http_status,
            "error_message": self.error_message,
            "response_time": self.response_time,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }



class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), index=True, nullable=False)
    description = Column(Text, default="")
    exam_type = Column(String(50), default="general")
    category = Column(String(50), default="universite")
    status = Column(String(50), default="active")
    order = Column(Integer, default=0)
    scoring_config = Column(JSON, nullable=True)
    exam_date = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        d = {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "exam_type": self.exam_type or "general",
            "category": self.category or "universite",
            "status": self.status or "active",
            "order": self.order or 0,
            "exam_date": self.exam_date,
            "created_at": self.created_at,
        }
        if self.scoring_config:
            d["scoring_config"] = self.scoring_config
        return d


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), index=True, nullable=False)
    slug = Column(String(100), default="general")
    order = Column(Integer, default=0)
    status = Column(String(50), default="active")
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "name": self.name,
            "slug": self.slug or "general",
            "order": self.order or 0,
            "status": self.status or "active",
            "created_at": self.created_at,
        }


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(150), index=True, nullable=False)
    order = Column(Integer, default=0)
    status = Column(String(50), default="active")
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "name": self.name,
            "order": self.order or 0,
            "status": self.status or "active",
            "created_at": self.created_at,
        }


class Subtopic(Base):
    __tablename__ = "subtopics"

    id = Column(String(36), primary_key=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    order = Column(Integer, default=0)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "topic_id": self.topic_id,
            "name": self.name,
            "order": self.order or 0,
            "created_at": self.created_at,
        }


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False)
    subtopic_id = Column(String(36), nullable=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="multiple_choice")
    option_a = Column(Text, default="")
    option_b = Column(Text, default="")
    option_c = Column(Text, default="")
    option_d = Column(Text, default="")
    option_e = Column(Text, default="")
    correct_answer = Column(String(10), nullable=False)
    explanation = Column(Text, default="")
    difficulty = Column(String(20), default="orta")
    source = Column(String(255), default="")
    year = Column(Integer, nullable=True)
    tags = Column(JSON, default=list)
    status = Column(String(50), default="active")
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)

    __table_args__ = (
        Index("ix_questions_lookup", "exam_id", "subject_id", "topic_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "subtopic_id": self.subtopic_id,
            "question_text": self.question_text,
            "question_type": self.question_type or "multiple_choice",
            "option_a": self.option_a or "",
            "option_b": self.option_b or "",
            "option_c": self.option_c or "",
            "option_d": self.option_d or "",
            "option_e": self.option_e or "",
            "correct_answer": self.correct_answer,
            "explanation": self.explanation or "",
            "difficulty": self.difficulty or "orta",
            "source": self.source or "",
            "year": self.year,
            "tags": self.tags or [],
            "status": self.status or "active",
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class Test(Base):
    __tablename__ = "tests"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    duration_minutes = Column(Integer, default=30)
    question_ids = Column(JSON, nullable=False)
    difficulty = Column(String(50), default="orta")
    status = Column(String(50), default="published")
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "exam_id": self.exam_id,
            "duration_minutes": self.duration_minutes or 30,
            "question_ids": self.question_ids or [],
            "difficulty": self.difficulty or "orta",
            "status": self.status or "published",
            "created_at": self.created_at,
        }


class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(String(36), primary_key=True)
    test_id = Column(String(36), ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String(50), default="in_progress")
    start_time = Column(String(50), nullable=False)
    end_time = Column(String(50), nullable=True)
    answers = Column(JSON, default=dict)
    marked = Column(JSON, default=dict)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "test_id": self.test_id,
            "user_id": self.user_id,
            "status": self.status or "in_progress",
            "start_time": self.start_time,
            "end_time": self.end_time,
            "answers": self.answers or {},
            "marked": self.marked or {},
            "created_at": self.created_at,
        }


class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False)
    selected_answer = Column(String(10), nullable=True)
    correct_answer = Column(String(10), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    is_blank = Column(Boolean, default=False)
    time_spent = Column(Integer, default=0)
    mistake_reason = Column(String(50), nullable=True) # bilgi_eksikligi, dikkat_hatasi, islem_hatasi, etc.
    is_reviewed = Column(Boolean, default=False)
    reviewed_at = Column(String(50), nullable=True)
    exam_session_id = Column(String(36), nullable=True)
    created_at = Column(String(50), index=True, nullable=False)

    __table_args__ = (
        Index("ix_user_answers_perf", "user_id", "topic_id"),
        Index("ix_user_answers_recent", "user_id", "created_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "selected_answer": self.selected_answer,
            "correct_answer": self.correct_answer,
            "is_correct": self.is_correct,
            "is_blank": self.is_blank or False,
            "time_spent": self.time_spent or 0,
            "mistake_reason": self.mistake_reason,
            "is_reviewed": self.is_reviewed or False,
            "reviewed_at": self.reviewed_at,
            "exam_session_id": self.exam_session_id,
            "created_at": self.created_at,
        }


class QuestionFeedback(Base):
    __tablename__ = "question_feedbacks"

    id = Column(String(36), primary_key=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String(100), nullable=False) # hatali_cevap, yazim_hatasi, eksik_gorsel, mufredat_disi, vb.
    description = Column(Text, default="")
    status = Column(String(50), default="pending") # pending, reviewed, resolved, dismissed
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "user_id": self.user_id,
            "reason": self.reason,
            "description": self.description or "",
            "status": self.status or "pending",
            "created_at": self.created_at,
        }


class UserTestResult(Base):
    __tablename__ = "user_test_results"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    session_id = Column(String(36), nullable=True)
    test_id = Column(String(36), ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False)
    test_name = Column(String(255), default="")
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    total = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    wrong = Column(Integer, default=0)
    blank = Column(Integer, default=0)
    net = Column(Float, default=0.0)
    score = Column(Float, default=0.0)
    success_rate = Column(Float, default=0.0)
    section_breakdown = Column(JSON, nullable=True)
    created_at = Column(String(50), index=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "test_id": self.test_id,
            "test_name": self.test_name or "",
            "exam_id": self.exam_id,
            "total": self.total or 0,
            "correct": self.correct or 0,
            "wrong": self.wrong or 0,
            "blank": self.blank or 0,
            "net": self.net or 0.0,
            "score": self.score or 0.0,
            "success_rate": self.success_rate or 0.0,
            "section_breakdown": self.section_breakdown or {},
            "created_at": self.created_at,
        }


class StudyNote(Base):
    __tablename__ = "study_notes"

    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False)
    content = Column(Text, default="")
    video_url = Column(String(500), default="")
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    status = Column(String(50), default="published")
    published_at = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description or "",
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "content": self.content or "",
            "video_url": self.video_url or "",
            "file_path": self.file_path,
            "file_name": self.file_name,
            "status": self.status or "published",
            "published_at": self.published_at or self.created_at,
            "created_at": self.created_at,
        }


class UserNoteActivity(Base):
    __tablename__ = "user_note_activities"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    note_id = Column(String(36), ForeignKey("study_notes.id", ondelete="CASCADE"), index=True, nullable=False)
    seconds_spent = Column(Integer, default=0)
    last_studied_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "note_id": self.note_id,
            "seconds_spent": self.seconds_spent or 0,
            "minutes_spent": round((self.seconds_spent or 0) / 60, 1),
            "last_studied_at": self.last_studied_at,
        }


class AIRecommendation(Base):

    __tablename__ = "ai_recommendations"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(String(50), index=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "result": self.result,
            "created_at": self.created_at,
        }


class UniversityProgram(Base):
    __tablename__ = "university_programs"

    id = Column(String(36), primary_key=True)
    university = Column(String(255), index=True, nullable=False)
    faculty = Column(String(255), default="")
    program = Column(String(255), index=True, nullable=False)
    exam_type = Column(String(50), default="YKS")
    score_type = Column(String(50), default="sayisal", index=True)
    city = Column(String(100), default="", index=True)
    duration_years = Column(Integer, default=4)
    scholarship = Column(String(50), default="")
    score_2023 = Column(Float, default=0.0)
    score_2024 = Column(Float, default=0.0)
    score_2025 = Column(Float, default=0.0)
    rank_2023 = Column(Integer, default=0)
    rank_2024 = Column(Integer, default=0)
    rank_2025 = Column(Integer, default=0)
    quota = Column(Integer, default=0)
    order = Column(Integer, default=0)
    status = Column(String(50), default="active")
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "university": self.university,
            "faculty": self.faculty or "",
            "program": self.program,
            "exam_type": self.exam_type or "YKS",
            "score_type": self.score_type or "sayisal",
            "city": self.city or "",
            "duration_years": self.duration_years or 4,
            "scholarship": self.scholarship or "",
            "score_2023": self.score_2023 or 0.0,
            "score_2024": self.score_2024 or 0.0,
            "score_2025": self.score_2025 or 0.0,
            "rank_2023": self.rank_2023 or 0,
            "rank_2024": self.rank_2024 or 0,
            "rank_2025": self.rank_2025 or 0,
            "quota": self.quota or 0,
            "order": self.order or 0,
            "status": self.status or "active",
            "created_at": self.created_at,
        }


class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, default="")
    icon = Column(String(50), default="Award")
    category = Column(String(50), default="genel")
    requirement_type = Column(String(50), default="questions_count")
    requirement_value = Column(Integer, default=10)
    xp_reward = Column(Integer, default=50)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "icon": self.icon or "Award",
            "category": self.category or "genel",
            "requirement_type": self.requirement_type or "questions_count",
            "requirement_value": self.requirement_value or 10,
            "xp_reward": self.xp_reward or 50,
            "created_at": self.created_at,
        }


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    badge_id = Column(String(36), ForeignKey("badges.id", ondelete="CASCADE"), index=True, nullable=False)
    earned_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "badge_id": self.badge_id,
            "earned_at": self.earned_at,
        }


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), default="Yeni Sohbet")
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("chat_conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String(20), default="user")  # user or assistant
    content = Column(Text, nullable=False)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at,
        }


class FileRecord(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True)
    storage_path = Column(String(500), index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "storage_path": self.storage_path,
            "original_filename": self.original_filename,
            "content_type": self.content_type,
            "size": self.size,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at,
        }


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(String(36), primary_key=True)
    identifier = Column(String(255), index=True, nullable=False)
    count = Column(Integer, default=1)
    locked_until = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), index=True, nullable=False)
    token = Column(String(255), index=True, nullable=False)
    expires_at = Column(String(50), nullable=False)
    created_at = Column(String(50), nullable=False)


class BlogPost(Base):
    """SEO uyumlu manuel ve otomatik blog yazıları"""
    __tablename__ = "blog_posts"

    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    summary = Column(Text, default="")
    content = Column(Text, default="")
    image_url = Column(String(500), nullable=True)
    category = Column(String(100), default="Genel") # Gündem, Sınav Rehberi, Eğitim, Haberler
    seo_keywords = Column(String(500), default="")
    author = Column(String(150), default="HedefMatik AI")
    status = Column(String(50), default="published") # published, draft
    views = Column(Integer, default=0)
    created_at = Column(String(50), index=True, nullable=False)
    updated_at = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "summary": self.summary or "",
            "content": self.content or "",
            "image_url": self.image_url,
            "category": self.category,
            "seo_keywords": self.seo_keywords,
            "author": self.author,
            "status": self.status,
            "views": self.views or 0,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

