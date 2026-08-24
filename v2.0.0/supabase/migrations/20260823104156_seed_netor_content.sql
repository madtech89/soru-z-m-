/*
# Seed Netor Content Data

Seeds: 10 exams, subjects, topics, 6 questions per topic, deneme tests, study notes, scoring configs.
*/

DO $$
DECLARE
  e_id uuid;
  s_id uuid;
  q_id uuid;
  topic_name text;
  subj_name text;
  q_counter integer;
  diff_idx integer;
  ans_idx integer;
  picked_arr uuid[];
  scoring jsonb;
  exam_rec record;
  topic_rec record;
  note_content text;
BEGIN
  IF EXISTS (SELECT 1 FROM exams LIMIT 1) THEN
    RETURN;
  END IF;

  -- 1. Exams
  INSERT INTO exams (id, name, description, exam_type, status, "order") VALUES
    (gen_random_uuid(), 'YKS', 'Yükseköğretim Kurumları Sınavı', 'general', 'active', 0),
    (gen_random_uuid(), 'TYT', 'Temel Yeterlilik Testi', 'general', 'active', 1),
    (gen_random_uuid(), 'AYT', 'Alan Yeterlilik Testi', 'general', 'active', 2),
    (gen_random_uuid(), 'KPSS Lisans', 'Kamu Personeli Seçme Sınavı - Lisans', 'general', 'active', 3),
    (gen_random_uuid(), 'KPSS Ön Lisans', 'Kamu Personeli Seçme Sınavı - Ön Lisans', 'general', 'active', 4),
    (gen_random_uuid(), 'TUS', 'Tıpta Uzmanlık Sınavı', 'general', 'active', 5),
    (gen_random_uuid(), 'DUS', 'Diş Hekimliğinde Uzmanlık Sınavı', 'general', 'active', 6),
    (gen_random_uuid(), 'ALES', 'Akademik Personel ve Lisansüstü Eğitim Sınavı', 'general', 'active', 7),
    (gen_random_uuid(), 'DGS', 'Dikey Geçiş Sınavı', 'general', 'active', 8),
    (gen_random_uuid(), 'YDS', 'Yabancı Dil Sınavı', 'general', 'active', 9);

  -- 2. Subjects
  SELECT id INTO e_id FROM exams WHERE name = 'YKS';
  INSERT INTO subjects (id, exam_id, name, slug, "order", status) VALUES
    (gen_random_uuid(), e_id, 'Matematik', 'matematik', 0, 'active'),
    (gen_random_uuid(), e_id, 'Türkçe', 'turkce', 1, 'active'),
    (gen_random_uuid(), e_id, 'Fizik', 'fen', 2, 'active'),
    (gen_random_uuid(), e_id, 'Kimya', 'fen', 3, 'active'),
    (gen_random_uuid(), e_id, 'Tarih', 'sosyal', 4, 'active');

  SELECT id INTO e_id FROM exams WHERE name = 'KPSS Lisans';
  INSERT INTO subjects (id, exam_id, name, slug, "order", status) VALUES
    (gen_random_uuid(), e_id, 'Genel Yetenek - Matematik', 'matematik', 0, 'active'),
    (gen_random_uuid(), e_id, 'Genel Yetenek - Türkçe', 'turkce', 1, 'active'),
    (gen_random_uuid(), e_id, 'Genel Kültür - Tarih', 'sosyal', 2, 'active'),
    (gen_random_uuid(), e_id, 'Genel Kültür - Coğrafya', 'sosyal', 3, 'active');

  SELECT id INTO e_id FROM exams WHERE name = 'TUS';
  INSERT INTO subjects (id, exam_id, name, slug, "order", status) VALUES
    (gen_random_uuid(), e_id, 'Farmakoloji', 'fen', 0, 'active'),
    (gen_random_uuid(), e_id, 'Anatomi', 'fen', 1, 'active'),
    (gen_random_uuid(), e_id, 'Fizyoloji', 'matematik', 2, 'active');

  -- 3. Topics
  SELECT id INTO e_id FROM exams WHERE name = 'YKS';

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Matematik';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Fonksiyonlar', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Problemler', 1, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Polinomlar', 2, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Türev', 3, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Türkçe';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Paragraf', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Dil Bilgisi', 1, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Sözcükte Anlam', 2, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Fizik';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Kuvvet ve Hareket', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Elektrik', 1, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Optik', 2, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Kimya';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Atom Yapısı', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Periyodik Sistem', 1, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Tarih';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'İnkılap Tarihi', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Osmanlı Tarihi', 1, 'active');

  SELECT id INTO e_id FROM exams WHERE name = 'KPSS Lisans';
  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Genel Yetenek - Matematik';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Problemler', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Sayılar', 1, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Rasyonel Sayılar', 2, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Genel Yetenek - Türkçe';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Paragraf', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Anlatım Bozukluğu', 1, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Genel Kültür - Tarih';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Kurtuluş Savaşı', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Osmanlı Devleti', 1, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Genel Kültür - Coğrafya';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Türkiye''nin İklimi', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Nüfus', 1, 'active');

  SELECT id INTO e_id FROM exams WHERE name = 'TUS';
  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Farmakoloji';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Antibiyotikler', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Analjezikler', 1, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Anatomi';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Kaslar', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Sinir Sistemi', 1, 'active');

  SELECT id INTO s_id FROM subjects WHERE exam_id = e_id AND name = 'Fizyoloji';
  INSERT INTO topics (id, exam_id, subject_id, name, "order", status) VALUES
    (gen_random_uuid(), e_id, s_id, 'Kalp', 0, 'active'),
    (gen_random_uuid(), e_id, s_id, 'Solunum', 1, 'active');

  -- 4. Questions (6 per topic)
  FOR topic_rec IN SELECT t.id, t.name, t.subject_id, t.exam_id, s.name AS subj_name FROM topics t JOIN subjects s ON t.subject_id = s.id LOOP
    FOR q_counter IN 1..6 LOOP
      q_id := gen_random_uuid();
      ans_idx := (q_counter % 5) + 1;
      diff_idx := (q_counter % 3) + 1;

      INSERT INTO questions (
        id, exam_id, subject_id, topic_id, subtopic_id,
        question_text, question_type,
        option_a, option_b, option_c, option_d, option_e,
        correct_answer, explanation, difficulty, source, year, tags, status
      ) VALUES (
        q_id, topic_rec.exam_id, topic_rec.subject_id, topic_rec.id, NULL,
        topic_rec.name || ' konusundan örnek soru #' || q_counter || ': Aşağıdakilerden hangisi doğrudur?',
        'multiple_choice',
        'Birinci seçenek', 'İkinci seçenek', 'Üçüncü seçenek', 'Dördüncü seçenek', 'Beşinci seçenek',
        CASE ans_idx WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C' WHEN 4 THEN 'D' ELSE 'E' END,
        'Bu soru ' || topic_rec.name || ' konusunun temel kavramını ölçer.',
        CASE diff_idx WHEN 1 THEN 'kolay' WHEN 2 THEN 'orta' ELSE 'zor' END,
        'Örnek Soru Bankası', 2024,
        jsonb_build_array(topic_rec.subj_name, topic_rec.name), 'active'
      );
    END LOOP;
  END LOOP;

  -- 5. Tests
  SELECT id INTO e_id FROM exams WHERE name = 'YKS';
  SELECT array_agg(q.id) INTO picked_arr FROM (SELECT id FROM questions WHERE exam_id = e_id LIMIT 10) q;
  INSERT INTO tests (id, name, description, exam_id, duration_minutes, question_ids, difficulty, status)
  VALUES (gen_random_uuid(), 'YKS Başlangıç Denemesi', 'YKS için hazırlanmış 10 soruluk deneme.', e_id, 20, to_jsonb(picked_arr), 'orta', 'published');

  SELECT array_agg(q.id) INTO picked_arr FROM (SELECT id FROM questions WHERE exam_id = e_id LIMIT 20) q;
  INSERT INTO tests (id, name, description, exam_id, duration_minutes, question_ids, difficulty, status)
  VALUES (gen_random_uuid(), 'YKS Genel Deneme', 'YKS için hazırlanmış 20 soruluk deneme.', e_id, 40, to_jsonb(picked_arr), 'orta', 'published');

  SELECT array_agg(q.id) INTO picked_arr FROM (SELECT id FROM questions WHERE exam_id = e_id LIMIT 15) q;
  INSERT INTO tests (id, name, description, exam_id, duration_minutes, question_ids, difficulty, status)
  VALUES (gen_random_uuid(), 'YKS Zor Deneme', 'YKS için hazırlanmış 15 soruluk zor deneme.', e_id, 35, to_jsonb(picked_arr), 'zor', 'published');

  SELECT id INTO e_id FROM exams WHERE name = 'KPSS Lisans';
  SELECT array_agg(q.id) INTO picked_arr FROM (SELECT id FROM questions WHERE exam_id = e_id LIMIT 10) q;
  INSERT INTO tests (id, name, description, exam_id, duration_minutes, question_ids, difficulty, status)
  VALUES (gen_random_uuid(), 'KPSS Lisans Başlangıç Denemesi', 'KPSS Lisans için hazırlanmış 10 soruluk deneme.', e_id, 20, to_jsonb(picked_arr), 'orta', 'published');

  SELECT array_agg(q.id) INTO picked_arr FROM (SELECT id FROM questions WHERE exam_id = e_id LIMIT 20) q;
  INSERT INTO tests (id, name, description, exam_id, duration_minutes, question_ids, difficulty, status)
  VALUES (gen_random_uuid(), 'KPSS Lisans Genel Deneme', 'KPSS Lisans için hazırlanmış 20 soruluk deneme.', e_id, 40, to_jsonb(picked_arr), 'orta', 'published');

  -- 6. Study Notes
  FOR topic_rec IN SELECT t.id, t.name, t.subject_id, t.exam_id, s.name AS subj_name FROM topics t JOIN subjects s ON t.subject_id = s.id LIMIT 30 LOOP
    note_content := topic_rec.name || ' konusu ' || topic_rec.subj_name || ' dersinin önemli başlıklarındandır. Temel kavramlar, sık yapılan hatalar ve çözüm stratejileri özetlenmiştir.

## Temel Kavramlar
Tanım, temel özellikler, formüller ve kullanım alanları dikkatle çalışılmalıdır.

## Sık Yapılan Hatalar
İşlem hataları ve kavram yanılgıları en yaygın sorunlardır.

## Strateji
- Önce kolay sorularla ısın
- Orta ve zor seviyeye geç
- Süreni ölç
- Yanlışlarını mutlaka tekrar çöz';

    INSERT INTO study_notes (
      id, title, description, exam_id, subject_id, topic_id,
      content, video_url, file_path, file_name, status, published_at
    ) VALUES (
      gen_random_uuid(),
      topic_rec.name || ' — Konu Anlatımı',
      topic_rec.subj_name || ' dersi ' || topic_rec.name || ' konusunun özet ders notu.',
      topic_rec.exam_id, topic_rec.subject_id, topic_rec.id,
      note_content, '', NULL, NULL, 'published', now()
    );
  END LOOP;

  -- 7. Scoring configs
  FOR exam_rec IN SELECT id FROM exams LOOP
    SELECT jsonb_agg(jsonb_build_object('name', name, 'question_count', 20, 'wrong_penalty', 0.25, 'coefficient', 1.0))
    INTO scoring FROM subjects WHERE exam_id = exam_rec.id;

    UPDATE exams SET scoring_config = jsonb_build_object(
      'sections', scoring,
      'base_score', 100.0,
      'multiplier', 1.0,
      'score_type', 'Ağırlıklı Puan'
    ) WHERE id = exam_rec.id;
  END LOOP;

END $$;
