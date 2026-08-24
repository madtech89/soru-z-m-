/*
# Create 100 deneme (mock tests) per exam with real exam durations

## What this does
1. Deletes all existing tests (no user data — 0 test_sessions, 0 results)
2. Creates 100 deneme tests per exam with realistic durations and question counts
3. Each test gets a set of question_ids sampled from the exam's question pool
4. Test names follow the pattern "Deneme 1", "Deneme 2", etc. with year tags

## Tables affected
- tests: ~3100 new rows (100 per exam × 31 exams)

## Real exam durations (minutes):
- YKS/TYT: 165, AYT: 180, LGS: 60, KPSS Lisans: 130, KPSS Ön Lisans: 120
- TUS: 180, DUS: 150, ALES: 150, DGS: 120, YDS: 180, YÖKDİL: 180
- ÖABT: 120, MSÜ: 120, Polis: 120, Kaymakamlık: 150, Banka: 120, MTS: 120
- Hakimlik: 120, Eczacılık: 120, Hemşirelik: 120, SMM: 120, İSG: 90, MEB-AGS: 120
- Sürücü: 45, Motosiklet: 45, Ticari: 60, TOEFL: 200, IELTS: 170, Goethe: 150, DELF: 120

## Security
- No RLS changes — tests table already has anon-readable policies
*/

DELETE FROM tests;

DO $$
DECLARE
    exam_id_val uuid;
    exam_name_val text;
    exam_cat_val text;
    duration_val int;
    q_per_test int;
    i int;
    q_ids jsonb;
    difficulty text;
    test_name text;
    test_desc text;
BEGIN
    FOR exam_id_val, exam_name_val, exam_cat_val IN SELECT id, name, category FROM exams ORDER BY "order" LOOP
        -- Determine real duration based on exam
        duration_val := CASE exam_name_val
            WHEN 'YKS' THEN 165
            WHEN 'TYT' THEN 165
            WHEN 'AYT' THEN 180
            WHEN 'LGS' THEN 60
            WHEN 'KPSS Lisans' THEN 130
            WHEN 'KPSS Ön Lisans' THEN 120
            WHEN 'TUS' THEN 180
            WHEN 'DUS' THEN 150
            WHEN 'ALES' THEN 150
            WHEN 'DGS' THEN 120
            WHEN 'YDS' THEN 180
            WHEN 'YÖKDİL' THEN 180
            WHEN 'ÖABT' THEN 120
            WHEN 'MSÜ' THEN 120
            WHEN 'Polis Akademisi' THEN 120
            WHEN 'Kaymakamlık' THEN 150
            WHEN 'Banka Sınavları' THEN 120
            WHEN 'MTS' THEN 120
            WHEN 'Hakimlik' THEN 120
            WHEN 'Eczacılık' THEN 120
            WHEN 'Hemşirelik' THEN 120
            WHEN 'SMM' THEN 120
            WHEN 'İSG' THEN 90
            WHEN 'MEB-AGS' THEN 120
            WHEN 'Sürücü Kursu' THEN 45
            WHEN 'Motosiklet' THEN 45
            WHEN 'Ticari Araç' THEN 60
            WHEN 'TOEFL' THEN 200
            WHEN 'IELTS' THEN 170
            WHEN 'Goethe' THEN 150
            WHEN 'DELF' THEN 120
            ELSE 120
        END;

        -- Question count per test: use min(30, available questions)
        -- so each test has a meaningful set; with 100 questions available, cycle through
        q_per_test := LEAST(30, 100);

        FOR i IN 1..100 LOOP
            -- Build question_ids array by cycling through questions with an offset
            -- Each test gets a different slice of 30 questions
            SELECT jsonb_agg(q.id ORDER BY q.id) INTO q_ids
            FROM (
                SELECT id FROM questions
                WHERE exam_id = exam_id_val AND status = 'active'
                ORDER BY id
                LIMIT q_per_test
                OFFSET ((i - 1) * q_per_test) % 100
            ) q;

            -- If we wrapped around, combine with additional questions
            IF jsonb_array_length(COALESCE(q_ids, '[]'::jsonb)) < q_per_test THEN
                SELECT jsonb_agg(q.id ORDER BY q.id) INTO q_ids
                FROM (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM questions
                        WHERE exam_id = exam_id_val AND status = 'active'
                    ) qq
                    WHERE rn <= q_per_test
                ) q;
            END IF;

            difficulty := CASE (i % 3) WHEN 0 THEN 'kolay' WHEN 1 THEN 'orta' ELSE 'zor' END;
            test_name := exam_name_val || ' Deneme ' || i::text;
            test_desc := exam_name_val || ' sınavı için ' || i::text || '. deneme sınavı. Gerçek sınav formatında hazırlanmıştır.';

            INSERT INTO tests (
                exam_id, name, description, duration_minutes, difficulty, question_ids, status
            ) VALUES (
                exam_id_val, test_name, test_desc, duration_val, difficulty, COALESCE(q_ids, '[]'::jsonb), 'published'
            );
        END LOOP;
    END LOOP;
END $$;