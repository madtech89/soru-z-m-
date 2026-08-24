-- =====================================================
-- Generate subjects, topics, and 30 questions per exam
-- for all exams that currently have 0 questions
-- =====================================================

DO $$
DECLARE
  exam RECORD;
  subj_id uuid;
  topic_id uuid;
  subj_name text;
  subj_slug text;
  s_idx int;
  t_idx int;
  topic_name text;
  q_order int;
  q_text text;
  correct char;
  difficulty text;
  per_subject int;
  q_counter int;
  num_subjects int;
  questions_per_subject int;
  remaining_q int;
  subject_ids uuid[];
  topic_ids uuid[];
  subject_names text[];
  topic_names_arr text[];
  tags_json jsonb;
BEGIN
  FOR exam IN
    SELECT e.id, e.name, e.category
    FROM exams e
    WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.status = 'active')
  LOOP
    subject_names := ARRAY[]::text[];
    topic_names_arr := ARRAY[]::text[];

    IF exam.category = 'universite' THEN
      subject_names := ARRAY['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler'];
      topic_names_arr := ARRAY['Sayılar', 'Cebir', 'Paragraf', 'Dilbilgisi', 'Fizik', 'Kimya', 'Tarih', 'Coğrafya'];
    ELSIF exam.category = 'lise' THEN
      subject_names := ARRAY['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler'];
      topic_names_arr := ARRAY['Fonksiyonlar', 'Trigonometri', 'Edebiyat', 'Dilbilgisi', 'Fizik', 'Kimya', 'Tarih', 'Coğrafya'];
    ELSIF exam.category = 'ortaokul' THEN
      subject_names := ARRAY['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler'];
      topic_names_arr := ARRAY['Kesirler', 'Yüzdeler', 'Paragraf', 'Dilbilgisi', 'Madde ve Isı', 'Kuvvet', 'Tarih', 'Coğrafya'];
    ELSIF exam.category = 'kpss' THEN
      subject_names := ARRAY['Genel Yetenek', 'Genel Kültür'];
      topic_names_arr := ARRAY['Matematik', 'Türkçe', 'Tarih', 'Coğrafya', 'Vatandaşlık'];
    ELSIF exam.category = 'saglik' THEN
      subject_names := ARRAY['Temel Bilimler', 'Klinik Bilimler'];
      topic_names_arr := ARRAY['Anatomi', 'Fizyoloji', 'Farmakoloji', 'Patoloji', 'İç Hastalıkları'];
    ELSIF exam.category = 'surucu' THEN
      subject_names := ARRAY['Trafik Kuralları', 'İlk Yardım', 'Motor Bilgisi'];
      topic_names_arr := ARRAY['Trafik İşaretleri', 'Hız Kuralları', 'Temel İlk Yardım', 'Araç Bakımı'];
    ELSIF exam.category = 'mesleki' THEN
      subject_names := ARRAY['Mesleki Bilgi', 'Genel Kültür'];
      topic_names_arr := ARRAY['Meslek Hukuku', 'Etik', 'Türkçe', 'Matematik', 'Vatandaşlık'];
    ELSIF exam.category = 'dil' THEN
      subject_names := ARRAY['Grammar', 'Reading', 'Vocabulary'];
      topic_names_arr := ARRAY['Tenses', 'Conditionals', 'Passive Voice', 'Word Formation', 'Cloze Test'];
    ELSE
      subject_names := ARRAY['Genel Kültür'];
      topic_names_arr := ARRAY['Genel Sorular'];
    END IF;

    num_subjects := array_length(subject_names, 1);
    subject_ids := ARRAY[]::uuid[];
    topic_ids := ARRAY[]::uuid[];

    FOR s_idx IN 1..num_subjects LOOP
      subj_name := subject_names[s_idx];
      subj_slug := CASE
        WHEN subj_name ILIKE '%matematik%' OR subj_name ILIKE '%genel yetenek%' THEN 'matematik'
        WHEN subj_name ILIKE '%türkçe%' OR subj_name ILIKE 'grammar' OR subj_name ILIKE 'reading' THEN 'turkce'
        WHEN subj_name ILIKE '%fen%' OR subj_name ILIKE '%temel%' OR subj_name ILIKE '%klinik%' OR subj_name ILIKE '%motor%' THEN 'fen'
        WHEN subj_name ILIKE '%sosyal%' OR subj_name ILIKE '%genel kültür%' OR subj_name ILIKE '%mesleki%' OR subj_name ILIKE '%vocabulary%' THEN 'sosyal'
        ELSE 'general'
      END;

      subj_id := gen_random_uuid();
      INSERT INTO subjects (id, exam_id, name, slug, "order", created_at)
      VALUES (subj_id, exam.id, subj_name, subj_slug, s_idx - 1, now());

      subject_ids := array_append(subject_ids, subj_id);

      FOR t_idx IN 1..2 LOOP
        topic_name := topic_names_arr[((s_idx - 1) * 2 + t_idx - 1) % array_length(topic_names_arr, 1) + 1];
        topic_id := gen_random_uuid();
        INSERT INTO topics (id, exam_id, subject_id, name, "order", status, created_at)
        VALUES (topic_id, exam.id, subj_id, topic_name, t_idx - 1, 'active', now());

        topic_ids := array_append(topic_ids, topic_id);
      END LOOP;
    END LOOP;

    questions_per_subject := 30 / num_subjects;
    remaining_q := 30 - (questions_per_subject * num_subjects);
    q_counter := 0;

    FOR s_idx IN 1..num_subjects LOOP
      subj_id := subject_ids[s_idx];
      subj_name := subject_names[s_idx];
      topic_id := topic_ids[(s_idx - 1) * 2 + 1];

      per_subject := questions_per_subject;
      IF s_idx = 1 THEN
        per_subject := per_subject + remaining_q;
      END IF;

      FOR q_order IN 1..per_subject LOOP
        q_counter := q_counter + 1;
        correct := CASE (q_order % 4)
          WHEN 0 THEN 'A'
          WHEN 1 THEN 'B'
          WHEN 2 THEN 'C'
          ELSE 'D'
        END;
        difficulty := CASE
          WHEN q_order % 3 = 0 THEN 'zor'
          WHEN q_order % 3 = 1 THEN 'orta'
          ELSE 'kolay'
        END;
        q_text := subj_name || ' - ' || exam.name || ' soru #' || q_counter || ': Aşağıdakilerden hangisi doğrudur?';
        tags_json := to_jsonb(ARRAY[subj_name]::text[]);

        INSERT INTO questions (
          id, exam_id, subject_id, topic_id, subtopic_id,
          question_text, question_type,
          option_a, option_b, option_c, option_d, option_e,
          correct_answer, explanation, difficulty, source, year, tags, status, created_at
        ) VALUES (
          gen_random_uuid(), exam.id, subj_id, topic_id, NULL,
          q_text, 'multiple_choice',
          'Birinci seçenek', 'İkinci seçenek', 'Üçüncü seçenek', 'Dördüncü seçenek', 'Beşinci seçenek',
          correct, subj_name || ' konusunun temel kavramını ölçen soru.', difficulty, 'Netor Soru Bankası', 2024,
          tags_json, 'active', now()
        );
      END LOOP;
    END LOOP;

  END LOOP;
END $$;
