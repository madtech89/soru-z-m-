import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import pymysql
import pymysql.connections

# Support Turkish/Unicode characters in MySQL passwords for PyMySQL & aiomysql
orig_pymysql_init = pymysql.connections.Connection.__init__
def _patched_pymysql_init(self, *args, **kwargs):
    if 'password' in kwargs and isinstance(kwargs['password'], str):
        try:
            kwargs['password'].encode('latin1')
        except UnicodeEncodeError:
            kwargs['password'] = kwargs['password'].encode('utf-8')
    orig_pymysql_init(self, *args, **kwargs)
pymysql.connections.Connection.__init__ = _patched_pymysql_init

try:
    import aiomysql.connection
    orig_req_auth = aiomysql.connection.Connection._request_authentication
    async def _patched_req_auth(self):
        if isinstance(self._password, str):
            try:
                self._password.encode('latin1')
            except UnicodeEncodeError:
                self._password = self._password.encode('utf-8').decode('latin1')
        return await orig_req_auth(self)
    aiomysql.connection.Connection._request_authentication = _patched_req_auth
except Exception:
    pass

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

DB_NAME = os.environ.get("DB_NAME", "hedefmatik_db")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", 3306))

if "MYSQL_URL" in os.environ and os.environ["MYSQL_URL"]:
    MYSQL_URL = os.environ["MYSQL_URL"]
else:
    MYSQL_URL = f"mysql+aiomysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

engine = create_async_engine(
    MYSQL_URL,
    echo=False,
    pool_recycle=3600,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def ensure_database_exists():
    """Ensure the MySQL database exists and migrate any new columns cleanly."""
    conn_kwargs = {
        "user": DB_USER,
        "password": DB_PASSWORD,
        "charset": "utf8mb4",
        "autocommit": True,
    }
    if os.path.exists("/tmp/mysql.sock") and DB_HOST in ("127.0.0.1", "localhost"):
        conn_kwargs["unix_socket"] = "/tmp/mysql.sock"
    else:
        conn_kwargs["host"] = DB_HOST
        conn_kwargs["port"] = DB_PORT
    conn = pymysql.connect(**conn_kwargs)
    try:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                )
            except Exception:
                pass
            cursor.execute(f"USE `{DB_NAME}`;")

            # Auto-migrate users columns
            cursor.execute("SHOW TABLES LIKE 'users';")
            if cursor.fetchone():
                cursor.execute("SHOW COLUMNS FROM `users`;")
                cols = {row[0] for row in cursor.fetchall()}
                if "phone" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(50) DEFAULT '';")
                if "kvkk_consent" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `kvkk_consent` TINYINT(1) DEFAULT 0;")
                if "marketing_consent" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `marketing_consent` TINYINT(1) DEFAULT 0;")
                if "consent_date" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `consent_date` VARCHAR(50) NULL;")
                if "level" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `level` INT DEFAULT 1;")
                if "placement_completed" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `placement_completed` TINYINT(1) DEFAULT 0;")
                if "plan" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `plan` VARCHAR(50) DEFAULT 'free';")
                if "plan_expires_at" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `plan_expires_at` VARCHAR(50) NULL;")
                if "ai_credits" not in cols:
                    cursor.execute("ALTER TABLE `users` ADD COLUMN `ai_credits` INT DEFAULT 100;")

            # Auto-migrate exams columns

            cursor.execute("SHOW TABLES LIKE 'exams';")
            if cursor.fetchone():
                cursor.execute("SHOW COLUMNS FROM `exams`;")
                e_cols = {row[0] for row in cursor.fetchall()}
                if "category" not in e_cols:
                    cursor.execute("ALTER TABLE `exams` ADD COLUMN `category` VARCHAR(50) DEFAULT 'universite';")
                if "exam_date" not in e_cols:
                    cursor.execute("ALTER TABLE `exams` ADD COLUMN `exam_date` VARCHAR(50) NULL;")

            # Auto-migrate questions columns
            cursor.execute("SHOW TABLES LIKE 'questions';")
            if cursor.fetchone():
                cursor.execute("SHOW COLUMNS FROM `questions`;")
                q_cols = {row[0] for row in cursor.fetchall()}
                if "subtopic_id" not in q_cols:
                    cursor.execute("ALTER TABLE `questions` ADD COLUMN `subtopic_id` VARCHAR(36) NULL;")

            # Auto-migrate user_answers columns
            cursor.execute("SHOW TABLES LIKE 'user_answers';")
            if cursor.fetchone():
                cursor.execute("SHOW COLUMNS FROM `user_answers`;")
                ua_cols = {row[0] for row in cursor.fetchall()}
                if "mistake_reason" not in ua_cols:
                    cursor.execute("ALTER TABLE `user_answers` ADD COLUMN `mistake_reason` VARCHAR(50) NULL;")
                if "is_reviewed" not in ua_cols:
                    cursor.execute("ALTER TABLE `user_answers` ADD COLUMN `is_reviewed` TINYINT(1) DEFAULT 0;")
                if "reviewed_at" not in ua_cols:
                    cursor.execute("ALTER TABLE `user_answers` ADD COLUMN `reviewed_at` VARCHAR(50) NULL;")
    finally:
        conn.close()


async def init_models():
    ensure_database_exists()
    import models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
