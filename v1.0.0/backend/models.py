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
    target_exams = Column(JSON, default=list)
    target_score = Column(Float, nullable=True)
    daily_goal = Column(Integer, default=20)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
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
            "target_exams": self.target_exams or [],
            "target_score": self.target_score,
            "daily_goal": self.daily_goal or 20,
            "xp": self.xp or 0,
            "streak": self.streak or 0,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), index=True, nullable=False)
    description = Column(Text, default="")
    exam_type = Column(String(50), default="general")
    status = Column(String(50), default="active")
    order = Column(Integer, default=0)
    scoring_config = Column(JSON, nullable=True)
    created_at = Column(String(50), nullable=False)

    def to_dict(self):
        d = {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "exam_type": self.exam_type or "general",
            "status": self.status or "active",
            "order": self.order or 0,
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
            "exam_session_id": self.exam_session_id,
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
