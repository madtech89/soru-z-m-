/*
# Make content tables readable by anonymous users

## Overview
Updates SELECT policies on content tables (exams, subjects, topics, subtopics, 
questions, tests, study_notes, badges) to allow anonymous (unauthenticated) users 
to read them. This is needed for the pre-registration placement test flow where 
users pick an exam and solve questions before creating an account.

## Security
- Content tables become publicly readable (TO anon, authenticated) — these contain 
  only educational content, not user data.
- User-specific tables (user_answers, user_test_results, profiles, etc.) remain 
  authenticated-only with ownership checks.
- Write policies on content tables remain admin-only (authenticated + role check).
*/

-- EXAMS
DROP POLICY IF EXISTS "select_exams" ON exams;
CREATE POLICY "select_exams" ON exams FOR SELECT
  TO anon, authenticated USING (true);

-- SUBJECTS
DROP POLICY IF EXISTS "select_subjects" ON subjects;
CREATE POLICY "select_subjects" ON subjects FOR SELECT
  TO anon, authenticated USING (true);

-- TOPICS
DROP POLICY IF EXISTS "select_topics" ON topics;
CREATE POLICY "select_topics" ON topics FOR SELECT
  TO anon, authenticated USING (true);

-- SUBTOPICS
DROP POLICY IF EXISTS "select_subtopics" ON subtopics;
CREATE POLICY "select_subtopics" ON subtopics FOR SELECT
  TO anon, authenticated USING (true);

-- QUESTIONS
DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO anon, authenticated USING (true);

-- TESTS
DROP POLICY IF EXISTS "select_tests" ON tests;
CREATE POLICY "select_tests" ON tests FOR SELECT
  TO anon, authenticated USING (true);

-- STUDY NOTES
DROP POLICY IF EXISTS "select_notes" ON study_notes;
CREATE POLICY "select_notes" ON study_notes FOR SELECT
  TO anon, authenticated USING (true);

-- BADGES
DROP POLICY IF EXISTS "select_badges" ON badges;
CREATE POLICY "select_badges" ON badges FOR SELECT
  TO anon, authenticated USING (true);
