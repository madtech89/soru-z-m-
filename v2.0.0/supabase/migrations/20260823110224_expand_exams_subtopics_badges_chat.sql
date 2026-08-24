/*
# Expand exams with categories + add subtopics, badges, chat tables, level system

## Overview
This migration adds:
1. Exam categories and many new exam types (university, high school, middle school, driving, civil service, medical, professional)
2. Subtopics table for deeper topic-level analysis
3. Badges and user_badges tables for gamification
4. Chat conversations and messages tables for AI chat coach
5. Profiles: add level and placement_completed columns
6. Questions: add subtopic_id column

## New Tables
1. **subtopics** — Sub-topics under topics for granular analysis
2. **badges** — Badge definitions (name, description, icon, requirement type/threshold)
3. **user_badges** — User-earned badges
4. **chat_conversations** — AI chat conversation sessions
5. **chat_messages** — Individual messages within conversations

## Modified Tables
- **profiles**: add `level` (integer, default 1) and `placement_completed` (boolean, default false)
- **questions**: add `subtopic_id` (uuid, nullable, references subtopics)
- **exams**: add `category` (text, for grouping)

## Security
- subtopics: readable by all authenticated, admin-only writes
- badges: readable by all, admin-only writes
- user_badges: owner-scoped CRUD
- chat_conversations: owner-scoped CRUD
- chat_messages: owner-scoped (via user_id)
*/

-- ============ ADD CATEGORIES TO EXAMS ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'category') THEN
    ALTER TABLE exams ADD COLUMN category text NOT NULL DEFAULT 'universite';
  END IF;
END $$;

UPDATE exams SET category = 'universite' WHERE name IN ('YKS', 'TYT', 'AYT', 'DGS', 'ALES', 'YDS');
UPDATE exams SET category = 'kpss' WHERE name IN ('KPSS Lisans', 'KPSS Ön Lisans');
UPDATE exams SET category = 'saglik' WHERE name IN ('TUS', 'DUS');

-- ============ ADD NEW EXAMS ============
INSERT INTO exams (id, name, description, exam_type, status, "order", category)
SELECT gen_random_uuid(), v.exam_name, v.exam_desc, 'general', 'active', v.exam_ord, v.exam_cat
FROM (VALUES
  ('LGS', 'Liseye Geçiş Sistemi Sınavı', 'ortaokul', 10),
  ('YÖKDİL', 'Yabancı Dil Bilgisi Seviye Tespit Sınavı', 'universite', 12),
  ('ÖABT', 'Öğretmenlik Alan Bilgisi Testi', 'universite', 13),
  ('MSÜ', 'Milli Savunma Üniversitesi Askeri Öğrenci Aday Belirleme Sınavı', 'universite', 14),
  ('Polis Akademisi', 'Polis Akademisi Giriş Sınavı', 'universite', 15),
  ('Kaymakamlık', 'Kaymakam Adaylığı Giriş Sınavı', 'kpss', 16),
  ('Banka Sınavları', 'Banka Personel Alım Sınavları', 'kpss', 17),
  ('MTS', 'Merkezî Teşkilat Sınavı', 'kpss', 18),
  ('Hakimlik', 'Hakimlik ve Savcılık Sınavı', 'saglik', 19),
  ('Eczacılık', 'Eczacılıkta Uzmanlık Sınavı', 'saglik', 20),
  ('Hemşirelik', 'Hemşirelik Alanında Uzmanlık Sınavı', 'saglik', 21),
  ('SMM', 'Serbest Muhasebeci Mali Müşavirlik Sınavı', 'mesleki', 22),
  ('İSG', 'İş Sağlığı ve Güvenliği Sınavı', 'mesleki', 23),
  ('MEB-AGS', 'MEB Alan Geliştirme Sınavı', 'mesleki', 24),
  ('Sürücü Kursu', 'Sürücü Belgesi Sınavı', 'surucu', 25),
  ('Motosiklet', 'Motosiklet Sürücü Belgesi Sınavı', 'surucu', 26),
  ('Ticari Araç', 'Ticari Araç Sürücü Belgesi Sınavı', 'surucu', 27),
  ('TOEFL', 'Test of English as a Foreign Language', 'dil', 28),
  ('IELTS', 'International English Language Testing System', 'dil', 29),
  ('Goethe', 'Goethe-Zertifikat Almanca Sınavı', 'dil', 30),
  ('DELF', 'Diplome dEtudes en Langue Francaise', 'dil', 31)
) AS v(exam_name, exam_desc, exam_cat, exam_ord)
WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.name = v.exam_name);

-- ============ SUBTOPICS TABLE ============
CREATE TABLE IF NOT EXISTS subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);

ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_subtopics" ON subtopics;
CREATE POLICY "select_subtopics" ON subtopics FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_subtopics_admin" ON subtopics;
CREATE POLICY "insert_subtopics_admin" ON subtopics FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ ADD subtopic_id TO QUESTIONS ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'subtopic_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE questions ALTER COLUMN subtopic_id DROP NOT NULL;
    ALTER TABLE questions ALTER COLUMN subtopic_id TYPE uuid USING NULL;
    ALTER TABLE questions ADD CONSTRAINT questions_subtopic_id_fkey
      FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============ ADD level AND placement_completed TO PROFILES ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level') THEN
    ALTER TABLE profiles ADD COLUMN level integer NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'placement_completed') THEN
    ALTER TABLE profiles ADD COLUMN placement_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============ BADGES TABLE ============
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Award',
  color text NOT NULL DEFAULT '#4F46E5',
  requirement_type text NOT NULL DEFAULT 'xp',
  requirement_threshold integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_badges" ON badges;
CREATE POLICY "select_badges" ON badges FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_badges_admin" ON badges;
CREATE POLICY "insert_badges_admin" ON badges FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ USER BADGES TABLE ============
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_badges" ON user_badges;
CREATE POLICY "select_own_badges" ON user_badges FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_badges" ON user_badges;
CREATE POLICY "insert_own_badges" ON user_badges FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ CHAT CONVERSATIONS TABLE ============
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Yeni Sohbet',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON chat_conversations(user_id);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_convos" ON chat_conversations;
CREATE POLICY "select_own_convos" ON chat_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_convos" ON chat_conversations;
CREATE POLICY "insert_own_convos" ON chat_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_convos" ON chat_conversations;
CREATE POLICY "update_own_convos" ON chat_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_convos" ON chat_conversations;
CREATE POLICY "delete_own_convos" ON chat_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CHAT MESSAGES TABLE ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_user_id ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_msgs" ON chat_messages;
CREATE POLICY "select_own_msgs" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_msgs" ON chat_messages;
CREATE POLICY "insert_own_msgs" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_msgs" ON chat_messages;
CREATE POLICY "delete_own_msgs" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SEED BADGES ============
INSERT INTO badges (name, description, icon, color, requirement_type, requirement_threshold)
SELECT * FROM (VALUES
  ('İlk Adım', 'İlk sorunu çöz', 'Footprints', '#10B981', 'questions_solved', 1),
  ('Çözücü', '50 soru çöz', 'CheckCircle2', '#4F46E5', 'questions_solved', 50),
  ('Soru Ustası', '200 soru çöz', 'Award', '#F59E0B', 'questions_solved', 200),
  ('Soru Kralı', '500 soru çöz', 'Crown', '#EC4899', 'questions_solved', 500),
  ('Deneme Eskizi', 'İlk denemeni tamamla', 'FileText', '#10B981', 'tests_completed', 1),
  ('Deneme Ustası', '10 deneme tamamla', 'Trophy', '#4F46E5', 'tests_completed', 10),
  ('Seri Başlangıç', '3 gün seri', 'Flame', '#F43F5E', 'streak', 3),
  ('Haftalık Seri', '7 gün seri', 'Flame', '#F59E0B', 'streak', 7),
  ('Aylık Seri', '30 gün seri', 'Flame', '#EC4899', 'streak', 30),
  ('XP Toplayıcı', '500 XP topla', 'Zap', '#4F46E5', 'xp', 500),
  ('XP Ustası', '2000 XP topla', 'Zap', '#F59E0B', 'xp', 2000),
  ('Mükemmel Deneme', 'Tüm soruları doğru çöz', 'Star', '#10B981', 'perfect_test', 1),
  ('Seviye 5', 'Seviye 5e ulaş', 'TrendingUp', '#4F46E5', 'level', 5),
  ('Seviye 10', 'Seviye 10a ulaş', 'TrendingUp', '#F59E0B', 'level', 10)
) AS t(name, description, icon, color, requirement_type, requirement_threshold)
WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.name = t.name);

-- ============ SEED SUBTOPICS ============
DO $$
DECLARE
  topic_rec record;
  sub_idx integer;
  sub_names text[];
BEGIN
  IF EXISTS (SELECT 1 FROM subtopics LIMIT 1) THEN
    RETURN;
  END IF;

  FOR topic_rec IN SELECT id, name FROM topics LOOP
    sub_names := ARRAY[
      topic_rec.name || ' - Temel Kavramlar',
      topic_rec.name || ' - İleri Düzey',
      topic_rec.name || ' - Pratik Sorular'
    ];

    FOR sub_idx IN 1..3 LOOP
      INSERT INTO subtopics (topic_id, name, "order")
      VALUES (topic_rec.id, sub_names[sub_idx], sub_idx - 1);
    END LOOP;
  END LOOP;
END $$;
