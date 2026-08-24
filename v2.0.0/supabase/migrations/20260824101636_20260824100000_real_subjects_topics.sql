/*
# Replace placeholder subjects with real curriculum subjects and add real study topics

## What this does
1. Deletes all existing subjects (and cascades to topics, subtopics, questions, tests, study_notes)
   - No user data exists yet (0 answers, 0 results, 0 profiles), so deletion is safe
2. Inserts real curriculum subjects for each exam
3. Inserts real study topics for each subject

## Tables affected
- subjects: all rows deleted, new real curriculum subjects inserted
- topics: all rows deleted (cascade), new real topics inserted
- subtopics: all rows deleted (cascade)
- questions: all rows deleted (cascade) — will be re-seeded in next migration
- tests: all rows deleted (cascade) — will be re-seeded in next migration
- study_notes: all rows deleted (cascade)

## Security
- No RLS changes — content tables already have anon-readable policies from prior migration
*/

-- Step 1: Delete all existing subjects (cascades to topics, subtopics, questions, tests, study_notes)
DELETE FROM subjects;

-- Step 2: Insert real curriculum subjects for each exam
-- Format: (exam_id, name, slug, order, status)

-- YKS (c83035d7-082a-4d3b-8c99-b1d925531679) — TYT+AYT combined
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Türkçe', 'turkce', 0, 'active'),
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Matematik', 'matematik', 1, 'active'),
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Fen Bilimleri', 'fen', 2, 'active'),
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Sosyal Bilgiler', 'sosyal', 3, 'active'),
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Din Kültürü', 'din', 4, 'active'),
('c83035d7-082a-4d3b-8c99-b1d925531679', 'Yabancı Dil', 'ingilizce', 5, 'active');

-- TYT (a447bb32-d417-4aab-9983-3bcf5e2f3451)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Türkçe', 'turkce', 0, 'active'),
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Matematik', 'matematik', 1, 'active'),
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Fen Bilimleri', 'fen', 2, 'active'),
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Sosyal Bilgiler', 'sosyal', 3, 'active'),
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Din Kültürü', 'din', 4, 'active'),
('a447bb32-d417-4aab-9983-3bcf5e2f3451', 'Yabancı Dil', 'ingilizce', 5, 'active');

-- AYT (d67e9283-2a86-4dbf-b2ac-5996de2c2b9d)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Türk Dili ve Edebiyatı', 'turkce', 0, 'active'),
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Matematik', 'matematik', 1, 'active'),
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Fen Bilimleri', 'fen', 2, 'active'),
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Sosyal Bilgiler', 'sosyal', 3, 'active'),
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Din Kültürü', 'din', 4, 'active'),
('d67e9283-2a86-4dbf-b2ac-5996de2c2b9d', 'Yabancı Dil', 'ingilizce', 5, 'active');

-- KPSS Lisans (e4e2843d-d6da-4997-9dd8-89c33e7d8d05)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Yetenek - Türkçe', 'turkce', 0, 'active'),
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Yetenek - Matematik', 'matematik', 1, 'active'),
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Kültür - Tarih', 'tarih', 2, 'active'),
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Kültür - Coğrafya', 'cografya', 3, 'active'),
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Kültür - Vatandaşlık', 'vatandaslik', 4, 'active'),
('e4e2843d-d6da-4997-9dd8-89c33e7d8d05', 'Genel Kültür - Güncel', 'guncel', 5, 'active');

-- KPSS Ön Lisans (85d092f4-4873-4843-807e-ceca876b0659)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Yetenek - Türkçe', 'turkce', 0, 'active'),
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Yetenek - Matematik', 'matematik', 1, 'active'),
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Kültür - Tarih', 'tarih', 2, 'active'),
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Kültür - Coğrafya', 'cografya', 3, 'active'),
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Kültür - Vatandaşlık', 'vatandaslik', 4, 'active'),
('85d092f4-4873-4843-807e-ceca876b0659', 'Genel Kültür - Güncel', 'guncel', 5, 'active');

-- TUS (21d8fcb3-5353-4f44-be79-cece7f67fe45)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('21d8fcb3-5353-4f44-be79-cece7f67fe45', 'Temel Tıp Bilimleri', 'temel-tip', 0, 'active'),
('21d8fcb3-5353-4f44-be79-cece7f67fe45', 'Klinik Tıp Bilimleri', 'klinik-tip', 1, 'active'),
('21d8fcb3-5353-4f44-be79-cece7f67fe45', 'Farmakoloji', 'farmakoloji', 2, 'active');

-- DUS (97fbdca0-ac77-49a7-b278-9cd476f139df)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('97fbdca0-ac77-49a7-b278-9cd476f139df', 'Temel Diş Hekimliği', 'temel-dis', 0, 'active'),
('97fbdca0-ac77-49a7-b278-9cd476f139df', 'Klinik Diş Hekimliği', 'klinik-dis', 1, 'active'),
('97fbdca0-ac77-49a7-b278-9cd476f139df', 'Tıp Bilimleri', 'tip', 2, 'active');

-- ALES (92b97d24-c6b7-4425-82df-1b9d746f5a4e)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('92b97d24-c6b7-4425-82df-1b9d746f5a4e', 'Sayısal Mantık', 'matematik', 0, 'active'),
('92b97d24-c6b7-4425-82df-1b9d746f5a4e', 'Sözel Mantık', 'turkce', 1, 'active');

-- DGS (a40e5008-ff1f-4ddc-89a9-6fb00f55bc94)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('a40e5008-ff1f-4ddc-89a9-6fb00f55bc94', 'Sayısal Yetenek', 'matematik', 0, 'active'),
('a40e5008-ff1f-4ddc-89a9-6fb00f55bc94', 'Sözel Yetenek', 'turkce', 1, 'active');

-- YDS (b91ce597-275c-43ab-a502-f822cbab52ef)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('b91ce597-275c-43ab-a502-f822cbab52ef', 'İngilizce Dilbilgisi', 'ingilizce', 0, 'active'),
('b91ce597-275c-43ab-a502-f822cbab52ef', 'İngilizce Okuma', 'reading', 1, 'active'),
('b91ce597-275c-43ab-a502-f822cbab52ef', 'İngilizce Kelime Bilgisi', 'vocabulary', 2, 'active'),
('b91ce597-275c-43ab-a502-f822cbab52ef', 'İngilizce Cloze Test', 'cloze', 3, 'active');

-- LGS (61c4ff6d-745e-452a-aaa7-026877840466)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('61c4ff6d-745e-452a-aaa7-026877840466', 'Türkçe', 'turkce', 0, 'active'),
('61c4ff6d-745e-452a-aaa7-026877840466', 'Matematik', 'matematik', 1, 'active'),
('61c4ff6d-745e-452a-aaa7-026877840466', 'Fen Bilimleri', 'fen', 2, 'active'),
('61c4ff6d-745e-452a-aaa7-026877840466', 'İnkılap Tarihi', 'tarih', 3, 'active'),
('61c4ff6d-745e-452a-aaa7-026877840466', 'Din Kültürü', 'din', 4, 'active'),
('61c4ff6d-745e-452a-aaa7-026877840466', 'Yabancı Dil', 'ingilizce', 5, 'active');

-- YÖKDİL (2f1daf9d-f109-4a25-a9dc-7f5b24b11f26)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('2f1daf9d-f109-4a25-a9dc-7f5b24b11f26', 'İngilizce Dilbilgisi', 'ingilizce', 0, 'active'),
('2f1daf9d-f109-4a25-a9dc-7f5b24b11f26', 'İngilizce Okuma', 'reading', 1, 'active'),
('2f1daf9d-f109-4a25-a9dc-7f5b24b11f26', 'İngilizce Kelime Bilgisi', 'vocabulary', 2, 'active');

-- ÖABT (e02bc0d8-0fa0-442d-977d-495819714808)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('e02bc0d8-0fa0-442d-977d-495819714808', 'Alan Bilgisi', 'alan', 0, 'active'),
('e02bc0d8-0fa0-442d-977d-495819714808', 'Eğitim Bilimleri', 'egitim', 1, 'active'),
('e02bc0d8-0fa0-442d-977d-495819714808', 'Genel Kültür', 'genel', 2, 'active');

-- MSÜ (c5c26fb7-5e7b-44a1-a65f-f21f9af2084d)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('c5c26fb7-5e7b-44a1-a65f-f21f9af2084d', 'Matematik', 'matematik', 0, 'active'),
('c5c26fb7-5e7b-44a1-a65f-f21f9af2084d', 'Fizik', 'fen', 1, 'active'),
('c5c26fb7-5e7b-44a1-a65f-f21f9af2084d', 'Türkçe', 'turkce', 2, 'active'),
('c5c26fb7-5e7b-44a1-a65f-f21f9af2084d', 'Genel Kültür', 'sosyal', 3, 'active');

-- Polis Akademisi (55a49c33-87f0-4a8f-82db-0ef7fea56eb0)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('55a49c33-87f0-4a8f-82db-0ef7fea56eb0', 'Genel Yetenek', 'matematik', 0, 'active'),
('55a49c33-87f0-4a8f-82db-0ef7fea56eb0', 'Genel Kültür', 'sosyal', 1, 'active'),
('55a49c33-87f0-4a8f-82db-0ef7fea56eb0', 'Hukuk', 'hukuk', 2, 'active'),
('55a49c33-87f0-4a8f-82db-0ef7fea56eb0', 'Psikolojik Test', 'psikoloji', 3, 'active');

-- Kaymakamlık (2c5007f8-2fd5-4a13-bf4a-c26d19d98f94)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('2c5007f8-2fd5-4a13-bf4a-c26d19d98f94', 'Yönetim Bilimleri', 'yonetim', 0, 'active'),
('2c5007f8-2fd5-4a13-bf4a-c26d19d98f94', 'Hukuk', 'hukuk', 1, 'active'),
('2c5007f8-2fd5-4a13-bf4a-c26d19d98f94', 'İktisat', 'iktisat', 2, 'active'),
('2c5007f8-2fd5-4a13-bf4a-c26d19d98f94', 'Genel Kültür', 'sosyal', 3, 'active');

-- Banka Sınavları (b474c14c-a93f-4549-864d-40e55ab31771)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('b474c14c-a93f-4549-864d-40e55ab31771', 'Genel Yetenek', 'matematik', 0, 'active'),
('b474c14c-a93f-4549-864d-40e55ab31771', 'Genel Kültür', 'sosyal', 1, 'active'),
('b474c14c-a93f-4549-864d-40e55ab31771', 'Yabancı Dil', 'ingilizce', 2, 'active'),
('b474c14c-a93f-4549-864d-40e55ab31771', 'Bankacılık Bilgisi', 'bankacilik', 3, 'active');

-- MTS (6c357c11-373c-49d8-8396-03e8178d8145)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('6c357c11-373c-49d8-8396-03e8178d8145', 'Din Kültürü', 'din', 0, 'active'),
('6c357c11-373c-49d8-8396-03e8178d8145', 'Arapça', 'arapca', 1, 'active'),
('6c357c11-373c-49d8-8396-03e8178d8145', 'İslam Tarihi', 'tarih', 2, 'active'),
('6c357c11-373c-49d8-8396-03e8178d8145', 'Tefsir ve Hadis', 'tefsir', 3, 'active');

-- Hakimlik (af33cb41-a1d2-4a6f-abf9-e60cce3cffc3)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('af33cb41-a1d2-4a6f-abf9-e60cce3cffc3', 'Anayasa Hukuku', 'anayasa', 0, 'active'),
('af33cb41-a1d2-4a6f-abf9-e60cce3cffc3', 'Medeni Hukuk', 'medeni', 1, 'active'),
('af33cb41-a1d2-4a6f-abf9-e60cce3cffc3', 'Ceza Hukuku', 'ceza', 2, 'active'),
('af33cb41-a1d2-4a6f-abf9-e60cce3cffc3', 'İdare Hukuku', 'idare', 3, 'active');

-- Eczacılık (ead7ca9f-b85d-4d22-a06c-515b092fc580)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('ead7ca9f-b85d-4d22-a06c-515b092fc580', 'Farmakoloji', 'farmakoloji', 0, 'active'),
('ead7ca9f-b85d-4d22-a06c-515b092fc580', 'Farmasötik Kimya', 'kimya', 1, 'active'),
('ead7ca9f-b85d-4d22-a06c-515b092fc580', 'Farmakognozi', 'farmakognozi', 2, 'active'),
('ead7ca9f-b85d-4d22-a06c-515b092fc580', 'Klinik Eczacılık', 'klinik', 3, 'active');

-- Hemşirelik (3d552545-fb39-41b7-89cf-53bd25eb704f)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('3d552545-fb39-41b7-89cf-53bd25eb704f', 'Temel Hemşirelik', 'temel', 0, 'active'),
('3d552545-fb39-41b7-89cf-53bd25eb704f', 'İç Hastalıkları', 'ic-hastalik', 1, 'active'),
('3d552545-fb39-41b7-89cf-53bd25eb704f', 'Cerrahi Hemşirelik', 'cerrahi', 2, 'active'),
('3d552545-fb39-41b7-89cf-53bd25eb704f', 'Halk Sağlığı', 'halk-saglik', 3, 'active');

-- SMM (1d412c71-b7db-4f28-b4c6-73689fcc077f)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('1d412c71-b7db-4f28-b4c6-73689fcc077f', 'Sermaye Piyasası', 'sermaye', 0, 'active'),
('1d412c71-b7db-4f28-b4c6-73689fcc077f', 'Muhasebe', 'muhasebe', 1, 'active'),
('1d412c71-b7db-4f28-b4c6-73689fcc077f', 'Vergi Hukuku', 'vergi', 2, 'active'),
('1d412c71-b7db-4f28-b4c6-73689fcc077f', 'Finansal Yönetim', 'finans', 3, 'active');

-- İSG (b6d256a7-9616-4663-b6cb-574f0e281414)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('b6d256a7-9616-4663-b6cb-574f0e281414', 'İş Sağlığı', 'is-saglik', 0, 'active'),
('b6d256a7-9616-4663-b6cb-574f0e281414', 'İş Güvenliği', 'is-guvenlik', 1, 'active'),
('b6d256a7-9616-4663-b6cb-574f0e281414', 'Risk Değerlendirme', 'risk', 2, 'active'),
('b6d256a7-9616-4663-b6cb-574f0e281414', 'İş Hukuku', 'is-hukuk', 3, 'active');

-- MEB-AGS (e5012c74-f3d4-42b0-9849-e0ac4d93473a)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('e5012c74-f3d4-42b0-9849-e0ac4d93473a', 'Eğitim Programları', 'egitim', 0, 'active'),
('e5012c74-f3d4-42b0-9849-e0ac4d93473a', 'Öğretim Yöntemleri', 'ogretim', 1, 'active'),
('e5012c74-f3d4-42b0-9849-e0ac4d93473a', 'Ölçme ve Değerlendirme', 'olcme', 2, 'active'),
('e5012c74-f3d4-42b0-9849-e0ac4d93473a', 'Rehberlik', 'rehberlik', 3, 'active');

-- Sürücü Kursu (b5b47bd8-bda4-418f-b92f-a4d3191ad036)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('b5b47bd8-bda4-418f-b92f-a4d3191ad036', 'Trafik ve Çevre', 'trafik', 0, 'active'),
('b5b47bd8-bda4-418f-b92f-a4d3191ad036', 'Motor ve Araç Tekniği', 'motor', 1, 'active'),
('b5b47bd8-bda4-418f-b92f-a4d3191ad036', 'İlk Yardım', 'ilk-yardim', 2, 'active');

-- Motosiklet (811c48f1-e697-4549-92a4-05082077d0cf)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('811c48f1-e697-4549-92a4-05082077d0cf', 'Trafik ve Çevre', 'trafik', 0, 'active'),
('811c48f1-e697-4549-92a4-05082077d0cf', 'Motor ve Araç Tekniği', 'motor', 1, 'active'),
('811c48f1-e697-4549-92a4-05082077d0cf', 'İlk Yardım', 'ilk-yardim', 2, 'active');

-- Ticari Araç (20cee696-1142-4a67-ae6c-a09df723f7fb)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('20cee696-1142-4a67-ae6c-a09df723f7fb', 'Trafik ve Çevre', 'trafik', 0, 'active'),
('20cee696-1142-4a67-ae6c-a09df723f7fb', 'Motor ve Araç Tekniği', 'motor', 1, 'active'),
('20cee696-1142-4a67-ae6c-a09df723f7fb', 'İlk Yardım', 'ilk-yardim', 2, 'active');

-- TOEFL (21fa9d33-142a-43e0-a7c4-b01ec22009f7)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('21fa9d33-142a-43e0-a7c4-b01ec22009f7', 'Reading', 'reading', 0, 'active'),
('21fa9d33-142a-43e0-a7c4-b01ec22009f7', 'Listening', 'listening', 1, 'active'),
('21fa9d33-142a-43e0-a7c4-b01ec22009f7', 'Speaking', 'speaking', 2, 'active'),
('21fa9d33-142a-43e0-a7c4-b01ec22009f7', 'Writing', 'writing', 3, 'active');

-- IELTS (a2afbed0-7577-4e29-93ca-fcccc36dde1a)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('a2afbed0-7577-4e29-93ca-fcccc36dde1a', 'Reading', 'reading', 0, 'active'),
('a2afbed0-7577-4e29-93ca-fcccc36dde1a', 'Listening', 'listening', 1, 'active'),
('a2afbed0-7577-4e29-93ca-fcccc36dde1a', 'Speaking', 'speaking', 2, 'active'),
('a2afbed0-7577-4e29-93ca-fcccc36dde1a', 'Writing', 'writing', 3, 'active');

-- Goethe (89063674-0309-4dc9-aa84-1760c07f9887)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('89063674-0309-4dc9-aa84-1760c07f9887', 'Lesen', 'reading', 0, 'active'),
('89063674-0309-4dc9-aa84-1760c07f9887', 'Hören', 'listening', 1, 'active'),
('89063674-0309-4dc9-aa84-1760c07f9887', 'Schreiben', 'writing', 2, 'active'),
('89063674-0309-4dc9-aa84-1760c07f9887', 'Sprechen', 'speaking', 3, 'active');

-- DELF (dfc41f6f-ee26-4734-9e51-c0232efbebe4)
INSERT INTO subjects (exam_id, name, slug, "order", status) VALUES
('dfc41f6f-ee26-4734-9e51-c0232efbebe4', 'Lecture', 'reading', 0, 'active'),
('dfc41f6f-ee26-4734-9e51-c0232efbebe4', 'Écoute', 'listening', 1, 'active'),
('dfc41f6f-ee26-4734-9e51-c0232efbebe4', 'Écrit', 'writing', 2, 'active'),
('dfc41f6f-ee26-4734-9e51-c0232efbebe4', 'Oral', 'speaking', 3, 'active');

-- Step 3: Insert real study topics for each subject
-- We use a DO block to iterate and insert topics per subject

DO $$
DECLARE
    subj RECORD;
    topic_list text[];
    idx int;
BEGIN
    FOR subj IN SELECT id, slug, exam_id FROM subjects ORDER BY "order" LOOP
        -- Define topics based on subject slug
        topic_list := CASE subj.slug
            -- Turkish / Language Arts
            WHEN 'turkce' THEN ARRAY[
                'Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Ses Bilgisi',
                'Yazım Kuralları', 'Noktalama İşaretleri', 'Sözcük Türleri',
                'Fiiller', 'Cümlenin Ögeleri', 'Anlatım Bozuklukları',
                'Düşünceyi Geliştirme Yolları', 'Paragrafta Yapı', 'Edebiyat Akımları',
                'Sözcükte Yapı', 'Fiilde Çatı', 'Yapım ve Ekler'
            ]
            -- Math
            WHEN 'matematik' THEN ARRAY[
                'Temel Kavramlar', 'Sayılar', 'Bölme ve Bölünebilme', 'Ebob-Ekok',
                'Rasyonel Sayılar', 'Üslü Sayılar', 'Köklü Sayılar', 'Mutlak Değer',
                'Çarpanlara Ayırma', 'Oran-Orantı', 'Denklemler', 'Eşitsizlikler',
                'Fonksiyonlar', 'Mantık', 'Kümeler', 'Modüler Aritmetik',
                'Permütasyon-Kombinasyon', 'Olasılık', 'Trigonometri', 'Limit'
            ]
            -- Science / Physics / Fen
            WHEN 'fen' THEN ARRAY[
                'Fizik: Vektörler', 'Fizik: Kuvvet ve Hareket', 'Fizik: İş ve Enerji',
                'Fizik: Elektrik', 'Fizik: Dalgalar', 'Fizik: Optik',
                'Kimya: Maddenin Halleri', 'Kimya: Atom ve Periyodik Sistem',
                'Kimya: Kimyasal Bağlar', 'Kimya: Mol Kavramı',
                'Kimya: Kimyasal Tepkimeler', 'Kimya: Asitler ve Bazlar',
                'Biyoloji: Hücre', 'Biyoloji: Sistemler',
                'Biyoloji: Üreme ve Gelişme', 'Biyoloji: Genetik'
            ]
            -- Social Studies
            WHEN 'sosyal' THEN ARRAY[
                'Tarih: İlk Çağ Uygarlıkları', 'Tarih: Orta Çağ', 'Tarih: Türk Tarihi',
                'Tarih: Osmanlı', 'Tarih: Atatürk İnkılapları',
                'Coğrafya: Doğal Sistemler', 'Coğrafya: Beşeri Sistemler',
                'Coğrafya: Türkiye Coğrafyası',
                'Felsefe: Varlık Felsefesi', 'Felsefe: Bilgi Felsefesi',
                'Felsefe: Etik', 'Felsefe: Siyaset Felsefesi',
                'Din: İnanç Esasları', 'Din: İbadet'
            ]
            WHEN 'tarih' THEN ARRAY[
                'İlk Çağ Uygarlıkları', 'Orta Çağ', 'Yeni Çağ',
                'Yakın Çağ', 'Türklerin İslamiyeti Kabulü',
                'İlk Türk İslam Devletleri', 'Osmanlı Kuruluş Dönemi',
                'Osmanlı Yükselme Dönemi', 'Osmanlı Duraklama Dönemi',
                'Tanzimat Dönemi', 'Kurtuluş Savaşı', 'Atatürk İnkılapları',
                'Atatürk İlkeleri', 'Türkiye Cumhuriyeti Tarihi'
            ]
            WHEN 'cografya' THEN ARRAY[
                'Doğal Sistemler', 'Beşeri Sistemler', 'Ekonomik Sistemler',
                'Coğrafi Konum', 'Yer Şekilleri', 'İklim Tipleri',
                'Bitki Örtüsü', 'Nüfus ve Yerleşme', 'Türkiye Coğrafyası',
                'Bölgeler Coğrafyası', 'Ulaşım', 'Tarım ve Hayvancılık'
            ]
            WHEN 'vatandaslik' THEN ARRAY[
                'Devlet ve Hükümet', 'Demokrasi', 'Anayasa Hukuku',
                'Temel Hak ve Ödevler', 'Yargı', 'Yasama',
                'Yürütme', 'Yerel Yönetimler', 'Kamu Yönetimi',
                'Avrupa Birliği', 'Uluslararası Kuruluşlar'
            ]
            WHEN 'guncel' THEN ARRAY[
                'Türkiye Güncel', 'Dünya Güncel', 'Ekonomi Güncel',
                'Bilim ve Teknoloji', 'Kültür ve Sanat', 'Spor Güncel'
            ]
            WHEN 'din' THEN ARRAY[
                'İnanç Esasları', 'İbadet', 'Kur''an-ı Kerim',
                'Peygamberler Tarihi', 'İslam Ahlakı', 'Siyer-i Nebi',
                'Dinler Tarihi', 'İslam Düşüncesi', 'Hadis', 'Tefsir'
            ]
            WHEN 'ingilizce' THEN ARRAY[
                'Tense (Zamanlar)', 'Modal Verbs', 'Passive Voice',
                'Conditionals', 'Relative Clauses', 'Reported Speech',
                'Gerund and Infinitive', 'Vocabulary', 'Reading Comprehension',
                'Cloze Test', 'Translation', 'Sentence Completion'
            ]
            WHEN 'reading' THEN ARRAY[
                'Main Idea', 'Detail Questions', 'Inference',
                'Vocabulary in Context', 'Author''s Purpose',
                'Text Structure', 'Skimming and Scanning', 'Critical Reading'
            ]
            WHEN 'listening' THEN ARRAY[
                'Note Taking', 'Main Idea', 'Detail Questions',
                'Inference', 'Following Directions', 'Lecture Comprehension'
            ]
            WHEN 'speaking' THEN ARRAY[
                'Pronunciation', 'Fluency', 'Coherence',
                'Vocabulary Usage', 'Grammar Accuracy', 'Task Response'
            ]
            WHEN 'writing' THEN ARRAY[
                'Essay Structure', 'Paragraph Development', 'Coherence and Cohesion',
                'Grammar Accuracy', 'Vocabulary Range', 'Task Achievement'
            ]
            WHEN 'vocabulary' THEN ARRAY[
                'Synonyms', 'Antonyms', 'Collocations',
                'Phrasal Verbs', 'Idioms', 'Word Formation'
            ]
            WHEN 'cloze' THEN ARRAY[
                'Grammar Cloze', 'Vocabulary Cloze', 'Contextual Cloze'
            ]
            -- Medical
            WHEN 'temel-tip' THEN ARRAY[
                'Anatomi', 'Fizyoloji', 'Biyokimya',
                'Mikrobiyoloji', 'Patoloji', 'Farmakoloji Temelleri',
                'İmmünoloji', 'Genetik', 'Histoloji', 'Embriyoloji'
            ]
            WHEN 'klinik-tip' THEN ARRAY[
                'İç Hastalıkları', 'Cerrahi', 'Kadın Doğum',
                'Çocuk Sağlığı', 'Psikiyatri', 'Dermatoloji',
                'Nöroloji', 'Ortopedi', 'Göz Hastalıkları', 'KBB'
            ]
            WHEN 'farmakoloji' THEN ARRAY[
                'Farmakokinetik', 'Farmakodinamik', 'Otonom Sinir Sistemi İlaçları',
                'Merkezi Sinir Sistemi İlaçları', 'Kardiyovasküler İlaçlar',
                'Antibiyotikler', 'Antiviraller', 'Endokrin İlaçlar',
                'Kemoterapötikler', 'Zehirlenme ve Antidotlar'
            ]
            WHEN 'temel-dis' THEN ARRAY[
                'Dental Anatomi', 'Oral Histoloji', 'Dental Materyaller',
                'Oral Fizyoloji', 'Patoloji'
            ]
            WHEN 'klinik-dis' THEN ARRAY[
                'Restoratif Diş Tedavisi', 'Endodonti', 'Periodontoloji',
                'Oral Cerrahi', 'Protetik Diş Tedavisi', 'Pedodonti',
                'Ortodonti'
            ]
            WHEN 'tip' THEN ARRAY[
                'Temel Tıp', 'İç Hastalıkları', 'Cerrahi',
                'Farmakoloji', 'Patoloji'
            ]
            WHEN 'arapca' THEN ARRAY[
                'Sarf', 'Nahiv', 'Arapça Kelime Bilgisi',
                'Metin Okuma', 'Arapça Dilbilgisi'
            ]
            WHEN 'tefsir' THEN ARRAY[
                'Tefsir İlmi', 'Hadis İlmi', 'Hadis Terminolojisi',
                'Kütüb-i Sitte', 'Tefsir Yöntemleri'
            ]
            -- Law
            WHEN 'hukuk' THEN ARRAY[
                'Hukuka Giriş', 'Medeni Hukuk', 'Ceza Hukuku',
                'İdare Hukuku', 'Anayasa Hukuku', 'Borçlar Hukuku',
                'Ticaret Hukuku', 'İş Hukuku'
            ]
            WHEN 'anayasa' THEN ARRAY[
                'Anayasa Hukukuna Giriş', 'Temel Haklar', 'Yasama',
                'Yürütme', 'Yargı', 'Anayasa Yargısı'
            ]
            WHEN 'medeni' THEN ARRAY[
                'Başlangıç Hükümleri', 'Kişiler Hukuku', 'Aile Hukuku',
                'Eşya Hukuku', 'Miras Hukuku'
            ]
            WHEN 'ceza' THEN ARRAY[
                'Ceza Hukuku Genel Hükümler', 'Ceza Hukuku Özel Hükümler',
                'Ceza Muhakemesi Hukuku', 'İnfaz Hukuku'
            ]
            WHEN 'idare' THEN ARRAY[
                'İdare Hukukuna Giriş', 'İdari Teşkilat', 'İdari İşlemler',
                'İdari Yargı', 'Kamu Personeli'
            ]
            -- Management / Economics
            WHEN 'yonetim' THEN ARRAY[
                'Yönetim Bilimlerine Giriş', 'Kamu Yönetimi', 'Örgüt Teorileri',
                'İnsan Kaynakları', 'Stratejik Yönetim', 'Karar Verme'
            ]
            WHEN 'iktisat' THEN ARRAY[
                'Mikroekonomi', 'Makroekonomi', 'Para Teorisi',
                'Uluslararası Ekonomi', 'Türkiye Ekonomisi', 'Kamu Maliyesi'
            ]
            WHEN 'bankacilik' THEN ARRAY[
                'Bankacılık Hukuku', 'Bankacılık İşlemleri', 'Kredi İşlemleri',
                'Risk Yönetimi', 'Finansal Piyasalar', 'Muhasebe'
            ]
            -- Education
            WHEN 'egitim' THEN ARRAY[
                'Eğitim Programları', 'Program Geliştirme', 'Eğitim Felsefesi',
                'Öğretim İlkeleri', 'Sınıf Yönetimi', 'Öğretim Teknolojileri'
            ]
            WHEN 'ogretim' THEN ARRAY[
                'Öğretim Yöntemleri', 'Öğretim Stratejileri', 'Öğretim Teknikleri',
                'Öğretim Materyalleri', 'Sınıf Yönetimi'
            ]
            WHEN 'olcme' THEN ARRAY[
                'Ölçme ve Değerlendirme', 'Test Geliştirme', 'İstatistik',
                'Değerlendirme Yöntemleri', 'Not Verme'
            ]
            WHEN 'rehberlik' THEN ARRAY[
                'Psikolojik Danışma', 'Rehberlik', 'Gelişim Psikolojisi',
                'Kariyer Rehberliği', 'Öğrenci Kişilik Hizmetleri'
            ]
            -- Health/Nursing
            WHEN 'temel' THEN ARRAY[
                'Hemşirelik Esasları', 'Hemşirelik Süreci', 'İletişim',
                'Hijyen ve Enfeksiyon', 'Vital Bulgular', 'İlaç Uygulamaları'
            ]
            WHEN 'ic-hastalik' THEN ARRAY[
                'Kardiyolojik Hemşirelik', 'Solunum Sistemi', 'Endokrin',
                'Gastrointestinal', 'Nörolojik Hemşirelik', 'Böbrek Hastalıkları'
            ]
            WHEN 'cerrahi' THEN ARRAY[
                'Preoperatif Hemşirelik', 'Postoperatif Hemşirelik', 'Travma',
                'Ortopedik Hemşirelik', 'Acil Hemşirelik'
            ]
            WHEN 'halk-saglik' THEN ARRAY[
                'Halk Sağlığı', 'Epidemiyoloji', 'Çocuk Sağlığı',
                'Anne Sağlığı', 'Aile Planlaması', 'İmmünizasyon'
            ]
            -- Finance
            WHEN 'sermaye' THEN ARRAY[
                'Sermaye Piyasası', 'Menkul Kıymetler', 'Yatırım Fonları',
                'Borsa İşlemleri', 'Türev Araçlar', 'Portföy Yönetimi'
            ]
            WHEN 'muhasebe' THEN ARRAY[
                'Finansal Muhasebe', 'Maliyet Muhasebesi', 'Muhasebe Standartları',
                'Bilanço', 'Gelir Tablosu', 'Kayıt Yöntemleri'
            ]
            WHEN 'vergi' THEN ARRAY[
                'Vergi Hukuku', 'Gelir Vergisi', 'Kurumlar Vergisi',
                'KDV', 'Vergi İncelemesi', 'Vergi Uyuşmazlıkları'
            ]
            WHEN 'finans' THEN ARRAY[
                'Finansal Yönetim', 'Finansal Analiz', 'Bütçeleme',
                'Finansal Planlama', 'Çalışma Sermayesi'
            ]
            -- Occupational Safety
            WHEN 'is-saglik' THEN ARRAY[
                'İş Sağlığı', 'Meslek Hastalıkları', 'İşyeri Hijyeni',
                'Ergonomi', 'Biolojik Risk Etkenleri', 'Kimyasal Risk Etkenleri'
            ]
            WHEN 'is-guvenlik' THEN ARRAY[
                'İş Güvenliği', 'İş Kazaları', 'Korunma Yöntemleri',
                'Kişisel Koruyucu Donanım', 'Acil Durum Planlama', 'Yangın Güvenliği'
            ]
            WHEN 'risk' THEN ARRAY[
                'Risk Değerlendirme', 'Risk Analizi Yöntemleri', 'Tehlike Tanımlama',
                'Kontrol Önlemleri', 'Risk Matrisi'
            ]
            WHEN 'is-hukuk' THEN ARRAY[
                'İş Hukuku', 'İş Sözleşmeleri', 'Sendikalar',
                'Toplu İş Sözleşmesi', 'İş Uyuşmazlıkları'
            ]
            -- Driver
            WHEN 'trafik' THEN ARRAY[
                'Trafik İşaretleri', 'Hız Kuralları', 'Geçiş Önceliği',
                'Araç Park Etme', 'Kavşaklarda Davranış', 'Şerit İzleme',
                'Trafik Cezaları', 'Emniyet Kemeri'
            ]
            WHEN 'motor' THEN ARRAY[
                'Motor Çalışma Prensibi', 'Yakıt Sistemi', 'Soğutma Sistemi',
                'Fren Sistemi', 'Direksiyon Sistemi', 'Elektrik Sistemi',
                'Lastik Bakımı', 'Yağlama Sistemi'
            ]
            WHEN 'ilk-yardim' THEN ARRAY[
                'Temel İlkyardım', 'Solunum ve Kalp Masajı', 'Kanama Durdurma',
                'Yaralanmalar', 'Kırık ve Çıkıklar', 'Yanık Tedavisi',
                'Şok', 'Zehirlenmeler'
            ]
            -- Pharmacy
            WHEN 'farmakognozi' THEN ARRAY[
                'Droglar', 'Bitkisel İlaçlar', 'Alkaloidler',
                'Glikozitler', 'Uçucu Yağlar', 'Tanenler'
            ]
            WHEN 'kimya' THEN ARRAY[
                'Organik Kimya', 'Anorganik Kimya', 'Analitik Kimya',
                'Stereoizomeri', 'Reaksiyon Mekanizmaları'
            ]
            WHEN 'klinik' THEN ARRAY[
                'Klinik Eczacılık', 'İlaç Etkileşimleri', 'Reçete Değerlendirmesi',
                'Hasta Danışmanlığı', 'İlaç Takibi'
            ]
            -- Religion
            WHEN 'genel' THEN ARRAY[
                'Genel Kültür', 'Türkçe', 'Matematik', 'Tarih'
            ]
            -- Psychology
            WHEN 'psikoloji' THEN ARRAY[
                'Psikolojik Testler', 'Kişilik Testleri', 'Zeka Testleri',
                'Yetenek Testleri', 'Durum Testleri'
            ]
            -- Other language slugs
            WHEN 'alan' THEN ARRAY[
                'Alan Bilgisi', 'Branş Bilgisi', 'Özel Eğitim',
                'Öğretim Programları', 'Ölçme Değerlendirme'
            ]
            WHEN 'genel-kultur' THEN ARRAY[
                'Tarih', 'Coğrafya', 'Felsefe', 'Vatandaşlık'
            ]
            ELSE ARRAY['Genel Konular', 'Temel Kavramlar', 'Uygulamalar']
        END;

        idx := 0;
        FOR i IN 1..array_length(topic_list, 1) LOOP
            INSERT INTO topics (exam_id, subject_id, name, "order", status)
            VALUES (subj.exam_id, subj.id, topic_list[i], idx, 'active');
            idx := idx + 1;
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Add subtopics for key topics ( TYT/AYT Math as an example template)
DO $$
DECLARE
    t RECORD;
    sub_list text[];
BEGIN
    FOR t IN SELECT id, name FROM topics WHERE name LIKE 'Fonksiyonlar' OR name LIKE 'Limit' OR name LIKE 'Denklemler' OR name LIKE 'Üslü Sayılar' LOOP
        sub_list := CASE t.name
            WHEN 'Fonksiyonlar' THEN ARRAY['Fonksiyon Tanımı', 'Fonksiyon Türleri', 'İşlem ve Bileşke', 'Ters Fonksiyon', 'Bölme ve Çarpma']
            WHEN 'Limit' THEN ARRAY['Sağ ve Sol Limit', 'Limit Hesaplama', 'Belirsizlikler', 'Süreklilik']
            WHEN 'Denklemler' THEN ARRAY['Birinci Derece Denklemler', 'İkinci Derece Denklemler', 'Mutlak Değer Denklemleri']
            WHEN 'Üslü Sayılar' THEN ARRAY['Üslü İfadelerde İşlemler', 'Üslü Denklemler', 'Negif Üs', 'Köklü İfadeye Dönüşüm']
            ELSE ARRAY['Genel']
        END;

        FOR i IN 1..array_length(sub_list, 1) LOOP
            INSERT INTO subtopics (topic_id, name, "order")
            VALUES (t.id, sub_list[i], i - 1);
        END LOOP;
    END LOOP;
END $$;