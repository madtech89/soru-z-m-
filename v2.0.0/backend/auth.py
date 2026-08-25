import os
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Response, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
import models as M

JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 24  # 1 day access for smoother UX
REFRESH_DAYS = 7


def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "supersecret_jwt_key_development_hedefmatik_2026")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False,
                        samesite="lax", max_age=REFRESH_DAYS * 86400, path="/")


def public_user(user: dict) -> dict:
    return {
        "id": user.get("id") or user.get("_id"),
        "email": user["email"],
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "role": user.get("role", "user"),
        "avatar": user.get("avatar", ""),
        "target_exams": user.get("target_exams", []),
        "target_score": user.get("target_score"),
        "daily_goal": user.get("daily_goal", 20),
        "xp": user.get("xp", 0),
        "streak": user.get("streak", 0),
        "created_at": user.get("created_at"),
    }


def extract_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Geçersiz token")
        uid = payload["sub"]
        result = await db.execute(select(M.User).where(M.User.id == uid))
        user_obj = result.scalars().first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user_obj.to_dict()
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


async def seed_admin(db: AsyncSession):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sinav.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    result = await db.execute(select(M.User).where(M.User.email == admin_email))
    existing = result.scalars().first()
    now_str = datetime.now(timezone.utc).isoformat()
    if existing is None:
        new_admin = M.User(
            id=str(uuid.uuid4()),
            email=admin_email,
            password_hash=hash_password(admin_password),
            name="Platform Admin",
            username="admin",
            role="admin",
            avatar="",
            target_exams=[],
            daily_goal=40,
            xp=0,
            streak=0,
            created_at=now_str,
            updated_at=now_str,
        )
        db.add(new_admin)
        await db.commit()
    elif not verify_password(admin_password, existing.password_hash):
        existing.password_hash = hash_password(admin_password)
        await db.commit()
