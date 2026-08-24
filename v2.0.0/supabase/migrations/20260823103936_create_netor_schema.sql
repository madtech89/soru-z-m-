/*
# Netor — Sınav Hazırlık Platformu Database Schema

## Overview
Creates the complete database schema for the Netor exam preparation platform.
This replaces the original FastAPI + MySQL backend with Supabase/PostgreSQL.

## New Tables

1. **profiles** — User profile data (linked to auth.users). Contains name, username, role,
   target_exams (array), target_score, daily_goal, xp, streak, avatar.
2. **exams** — Exam catalog (YKS, TYT, AYT, KPSS, etc.). Has scoring_config JSON.
3. **subjects** — Subjects per exam (Matematik, Türkçe, etc.) with slug for color theming.
4. **topics** — Topics per subject (Fonksiyonlar, Problemler, etc.).
5. **questions** — Multiple choice questions with 5 options, correct answer, difficulty, explanation.
6. **tests** — Deneme (practice test) with question_ids array, duration, difficulty.
7. **test_sessions** — User test-taking sessions with status tracking.
8. **user_answers** — Individual question answers (for practice and exams).
9. **user_test_results** — Aggregated test results (correct/wrong/blank/net/score).
10. **study_notes** — Study material with content, video_url, file_path.
11. **ai_recommendations** — AI coach analysis results.

## Security (RLS)
- profiles: users can read/update only their own profile. Admin can read all.
- exams, subjects, topics, questions, tests, study_notes: readable by all authenticated users.
  Admin-only writes (done via service role from edge functions or admin UI).
- test_sessions, user_answers, user_test_results, ai_recommendations: users access only their own.
- All write operations for content (exams, questions, notes, tests) are admin-only via profiles.role check.

## Seed Data
- 10 exams (YKS, TYT, AYT, KPSS Lisans, KPSS Ön Lisans, TUS, DUS, ALES, DGS, YDS)
- Subjects per exam with color slugs
- Topics per subject
- Sample questions (6 per topic)
- Deneme tests for YKS and KPSS
- Study notes for topics
- Scoring configs per exam
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user',
  avatar text NOT NULL DEFAULT '',
  target_exams jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_score float8,
  daily_goal integer NOT NULL DEFAULT 20,
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ EXAMS ============
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  "order" integer NOT NULL DEFAULT 0,
  scoring_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_exams" ON exams;
CREATE POLICY "select_exams" ON exams FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_exams_admin" ON exams;
CREATE POLICY "insert_exams_admin" ON exams FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "update_exams_admin" ON exams;
CREATE POLICY "update_exams_admin" ON exams FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ SUBJECTS ============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL DEFAULT 'general',
  "order" integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_exam_id ON subjects(exam_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_subjects" ON subjects;
CREATE POLICY "select_subjects" ON subjects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_subjects_admin" ON subjects;
CREATE POLICY "insert_subjects_admin" ON subjects FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "update_subjects_admin" ON subjects;
CREATE POLICY "update_subjects_admin" ON subjects FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ TOPICS ============
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topics_exam_id ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_topics" ON topics;
CREATE POLICY "select_topics" ON topics FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_topics_admin" ON topics;
CREATE POLICY "insert_topics_admin" ON topics FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ QUESTIONS ============
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id text,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  option_a text NOT NULL DEFAULT '',
  option_b text NOT NULL DEFAULT '',
  option_c text NOT NULL DEFAULT '',
  option_d text NOT NULL DEFAULT '',
  option_e text NOT NULL DEFAULT '',
  correct_answer text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'orta',
  source text NOT NULL DEFAULT '',
  year integer,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_subject_topic ON questions(exam_id, subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_questions_admin" ON questions;
CREATE POLICY "insert_questions_admin" ON questions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ TESTS ============
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL DEFAULT 30,
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty text NOT NULL DEFAULT 'orta',
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tests_exam_id ON tests(exam_id);

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tests" ON tests;
CREATE POLICY "select_tests" ON tests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_tests_admin" ON tests;
CREATE POLICY "insert_tests_admin" ON tests FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ TEST SESSIONS ============
CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  marked jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON test_sessions;
CREATE POLICY "select_own_sessions" ON test_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON test_sessions;
CREATE POLICY "insert_own_sessions" ON test_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON test_sessions;
CREATE POLICY "update_own_sessions" ON test_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER ANSWERS ============
CREATE TABLE IF NOT EXISTS user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  selected_answer text,
  correct_answer text NOT NULL,
  is_correct boolean NOT NULL,
  is_blank boolean NOT NULL DEFAULT false,
  time_spent integer NOT NULL DEFAULT 0,
  exam_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_topic ON user_answers(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_created ON user_answers(user_id, created_at);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_answers" ON user_answers;
CREATE POLICY "select_own_answers" ON user_answers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_answers" ON user_answers;
CREATE POLICY "insert_own_answers" ON user_answers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_answers" ON user_answers;
CREATE POLICY "update_own_answers" ON user_answers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER TEST RESULTS ============
CREATE TABLE IF NOT EXISTS user_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  test_name text NOT NULL DEFAULT '',
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  blank integer NOT NULL DEFAULT 0,
  net float8 NOT NULL DEFAULT 0.0,
  score float8 NOT NULL DEFAULT 0.0,
  success_rate float8 NOT NULL DEFAULT 0.0,
  section_breakdown jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_user_id ON user_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON user_test_results(created_at);

ALTER TABLE user_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_results" ON user_test_results;
CREATE POLICY "select_own_results" ON user_test_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_results" ON user_test_results;
CREATE POLICY "insert_own_results" ON user_test_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ STUDY NOTES ============
CREATE TABLE IF NOT EXISTS study_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  file_path text,
  file_name text,
  status text NOT NULL DEFAULT 'published',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_exam_id ON study_notes(exam_id);

ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notes" ON study_notes;
CREATE POLICY "select_notes" ON study_notes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_notes_admin" ON study_notes;
CREATE POLICY "insert_notes_admin" ON study_notes FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ AI RECOMMENDATIONS ============
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recs_user_id ON ai_recommendations(user_id);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_recs" ON ai_recommendations;
CREATE POLICY "select_own_ai_recs" ON ai_recommendations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_recs" ON ai_recommendations;
CREATE POLICY "insert_own_ai_recs" ON ai_recommendations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
