import asyncio
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
import config
from database import AsyncSessionLocal
import models as M
import ai as AICoach
from ai import key_manager
logger = logging.getLogger("sinav.worker")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

async def process_job(job_id: str):
    """Processes a single AI generation job."""
    async with AsyncSessionLocal() as session:
        job = await session.get(M.AIGenerationJob, job_id)
        if not job or job.status != "pending":
            return
        
        job.status = "processing"
        job.started_at = now_iso()
        job.attempt_count += 1
        await session.commit()
        await AICoach.key_manager.sync_from_db(session)

        # Cache values needed for generation outside session
        exam_id = job.exam_id
        exam_name = job.exam_name
        subject_id = job.subject_id
        subject_name = job.subject_name
        topic_id = job.topic_id
        topic_name = job.topic_name
        subtopic_id = job.subtopic_id
        subtopic_name = job.subtopic_name
        target_count = job.target_count
        difficulty = job.difficulty
        style = job.style
        max_retries = job.max_retries
        attempt_count = job.attempt_count
        
        # 1. Fetch existing samples (up to 30)
        sample_res = await session.execute(
            select(M.Question.question_text)
            .where(M.Question.subtopic_id == subtopic_id)
            .order_by(M.Question.created_at.desc())
            .limit(30)
        )
        existing_samples = list(sample_res.scalars().all())

    start_time = asyncio.get_event_loop().time()
    hierarchical_tag = f"{(exam_name or '').lower()} > {(subject_name or '').lower()} > {(topic_name or '').lower()} > {(subtopic_name or '').lower()}"
    
    try:
        questions = await AICoach.generate_custom_questions_ai(
            exam_name=exam_name,
            subject_name=subject_name,
            topic_name=topic_name,
            subtopic_name=subtopic_name,
            count=target_count,
            difficulty=difficulty,
            style=style,
            existing_samples=existing_samples,
        )
        
        end_time = asyncio.get_event_loop().time()
        
        # 3. Save Questions & Update Job Status
        async with AsyncSessionLocal() as save_session:
            for q_data in (questions or []):
                ai_tags = q_data.get("tags", [])
                if not isinstance(ai_tags, list):
                    ai_tags = []
                if hierarchical_tag not in [str(t).lower() for t in ai_tags]:
                    ai_tags.append(hierarchical_tag)
                
                q_obj = M.Question(
                    id=str(uuid.uuid4()),
                    exam_id=exam_id,
                    subject_id=subject_id,
                    topic_id=topic_id,
                    subtopic_id=subtopic_id,
                    question_text=q_data.get("question_text", "Soru"),
                    option_a=q_data.get("option_a", ""),
                    option_b=q_data.get("option_b", ""),
                    option_c=q_data.get("option_c", ""),
                    option_d=q_data.get("option_d", ""),
                    option_e=q_data.get("option_e", ""),
                    correct_answer=q_data.get("correct_answer", "A"),
                    difficulty=q_data.get("difficulty", difficulty),
                    explanation=q_data.get("explanation", ""),
                    tags=ai_tags,
                    status="published",
                    created_at=now_iso(),
                )
                save_session.add(q_obj)
            
            # Update job status
            job_db = await save_session.get(M.AIGenerationJob, job_id)
            if job_db:
                job_db.status = "completed"
                job_db.completed_at = now_iso()
                job_db.response_time = round(end_time - start_time, 2)
                job_db.http_status = 200
                job_db.error_message = None
            
            await save_session.commit()
            
        logger.info(f"✅ Job {job_id} completed. Added {len(questions or [])} questions for {subtopic_name}.")

    except Exception as e:
        err_msg = str(e)
        logger.error(f"❌ Job {job_id} failed: {err_msg}")
        async with AsyncSessionLocal() as fail_session:
            job_db = await fail_session.get(M.AIGenerationJob, job_id)
            if job_db:
                job_db.error_message = err_msg
                if getattr(e, 'status_code', None):
                    job_db.http_status = getattr(e, 'status_code')
                    
                if attempt_count < max_retries:
                    job_db.status = "pending" # Re-queue
                else:
                    job_db.status = "failed"
                    job_db.completed_at = now_iso()
                await fail_session.commit()

# In-memory tracking of active job tasks
active_job_ids = set()

async def queue_worker_loop():
    """Background polling loop for AIGenerationJob queue with auto-recovery."""
    logger.info("🚀 AI Generation Queue Worker started.")
    
    # 1. Startup Recovery: Reset orphaned/stale 'processing' jobs from previous server restarts back to 'pending'
    try:
        async with AsyncSessionLocal() as init_session:
            await init_session.execute(
                update(M.AIGenerationJob)
                .where(M.AIGenerationJob.status == "processing")
                .values(status="pending")
            )
            await init_session.commit()
            logger.info("🔄 Stale processing jobs reset to pending.")
    except Exception as reset_err:
        logger.warning(f"Could not reset stale processing jobs: {reset_err}")
    
    while True:
        try:
            # Clean up active_job_ids if needed
            capacity = max(0, config.MAX_CONCURRENT_REQUESTS - len(active_job_ids))
            
            if capacity > 0:
                async with AsyncSessionLocal() as session:
                    res_pending = await session.execute(
                        select(M.AIGenerationJob.id)
                        .where(M.AIGenerationJob.status == "pending")
                        .order_by(M.AIGenerationJob.created_at.asc())
                        .limit(capacity)
                    )
                    pending_job_ids = list(res_pending.scalars().all())
                    
                    for j_id in pending_job_ids:
                        if j_id not in active_job_ids:
                            active_job_ids.add(j_id)
                            
                            def _done_cb(fut, job_identifier=j_id):
                                active_job_ids.discard(job_identifier)
                                
                            task = asyncio.create_task(process_job(j_id))
                            task.add_done_callback(_done_cb)
                        
        except Exception as e:
            logger.error(f"Queue Worker error: {e}")
            
        await asyncio.sleep(config.QUEUE_POLL_INTERVAL)
