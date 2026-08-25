import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import pymysql

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MYSQL_URL = os.environ.get(
    "MYSQL_URL",
    "mysql+aiomysql://root:@127.0.0.1:3306/hedefmatik_db?charset=utf8mb4"
)

DB_NAME = os.environ.get("DB_NAME", "hedefmatik_db")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", 3306))

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
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
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
    finally:
        conn.close()


async def init_models():
    ensure_database_exists()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
