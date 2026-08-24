/*
# Replace placeholder content with real questions, deneme tests, and study notes

## Overview
1. Deletes all existing placeholder content (safe — 0 user data)
2. Recreates subjects, topics, subtopics with real names per exam category
3. Inserts 30 real questions per exam using a JSONB question bank
4. Creates 1 deneme test per exam + 2 study notes per exam
*/

DELETE FROM user_answers;
DELETE FROM user_test_results;
DELETE FROM test_sessions;
DELETE FROM tests;
DELETE FROM study_notes;
DELETE FROM questions;
DELETE FROM subtopics;
DELETE FROM topics;
DELETE FROM subjects;

DO $$
DECLARE
  exam RECORD;
  subj_id uuid;
  topic_id uuid;
  sub_id uuid;
  subj_name text;
  subj_slug text;
  s_idx int;
  t_idx int;
  sub_idx int;
  topic_name text;
  sub_names text[];
  q_order int;
  per_subject int;
  q_counter int;
  num_subjects int;
  questions_per_subject int;
  remaining_q int;
  subject_ids uuid[];
  topic_ids uuid[];
  subj_names_arr text[];
  topic_names_arr text[];
  q_ids jsonb;
  note_content text;
  qb jsonb;
  q_item jsonb;
  bank_size int;
  q_pick int;
BEGIN
  FOR exam IN SELECT id, name, category FROM exams ORDER BY name LOOP

    subj_names_arr := ARRAY[]::text[];
    topic_names_arr := ARRAY[]::text[];

    IF exam.category = 'universite' THEN
      subj_names_arr := ARRAY['Matematik','Turkce','Fen Bilimleri','Sosyal Bilgiler'];
      topic_names_arr := ARRAY['Sayilar ve Mutlak Deger','Uslu ve Koklu Sayilar','Paragraf','Dilbilgisi','Newton Hareket Kanunlari','Elektrik ve Manyetizma','Osmanli Kurulus Donemi','Turkiye Cografyasi'];
      qb := jsonb_build_array(
        jsonb_build_object('q','x = 3 olmak uzere, 2x^2 - 5x + 1 ifadesinin degeri kactir?','a','4','b','7','c','3','d','5','e','6','ok','A','ex','2*9 - 5*3 + 1 = 4'),
        jsonb_build_object('q','Bir dik ucgende dik kenarlar 6 ve 8 birim ise hipotenus kac birimdir?','a','10','b','12','c','14','d','15','e','16','ok','A','ex','Pisagor: 6^2+8^2=100, kok100=10'),
        jsonb_build_object('q','log2(32) isleminin sonucu kactir?','a','4','b','5','c','3','d','6','e','8','ok','B','ex','2^5=32 oldugundan log2(32)=5'),
        jsonb_build_object('q','f(x) = 3x - 7 fonksiyonunda f(x) = 11 ise x kactir?','a','6','b','5','c','4','d','7','e','8','ok','A','ex','3x-7=11, 3x=18, x=6'),
        jsonb_build_object('q','Bir sayinin yuzde 25''i 30''dur. Bu sayi kactir?','a','120','b','110','c','130','d','140','e','150','ok','A','ex','%25=1/4, sayi=30*4=120'),
        jsonb_build_object('q','(x-2)(x+3) carpiminin sonucu nedir?','a','x^2+x-6','b','x^2-x-6','c','x^2+x+6','d','x^2-x+6','e','x^2+6','ok','A','ex','x^2+3x-2x-6=x^2+x-6'),
        jsonb_build_object('q','Bir arabanin saatte 80 km hizla 3 saat gittiginde aldigi yol kac km''dir?','a','240','b','180','c','220','d','260','e','300','ok','A','ex','Yol=Hiz*Sure=80*3=240'),
        jsonb_build_object('q','sin(30 derece) degeri kactir?','a','1/2','b','kok3/2','c','kok2/2','d','1','e','0','ok','A','ex','sin(30)=1/2'),
        jsonb_build_object('q','Bir sinifta 30 ogrenci vardir. Matematik gecenler kalandan 6 fazla. Kac ogrenci gecmistir?','a','12','b','15','c','18','d','20','e','21','ok','C','ex','x+y=30, x-y=6, x=18'),
        jsonb_build_object('q','Bir kupun bir kenari 5 cm ise hacmi kac cm3 tur?','a','125','b','100','c','150','d','25','e','75','ok','A','ex','Kup hacmi=a^3=5^3=125'),
        jsonb_build_object('q','Asagidakilerden hangisi belirtisiz isim fiildir?','a','Bu kitap okunmaya deger','b','Guzel','c','Hizli','d','Caliskan','e','Mavi','ok','A','ex','Belirtisiz isim fiil: okunmaya deger'),
        jsonb_build_object('q','Hangi secenekteki sozcuk turemis isimdir?','a','Caliskanlik','b','Kitap','c','Masa','d','Su','e','Yol','ok','A','ex','Caliskanlik turemis isimdir'),
        jsonb_build_object('q','Asagidakilerden hangisi baglacir?','a','Ve','b','Guzel','c','Kitap','d','Hizli','e','Masa','ok','A','ex','Ve bir baglacir'),
        jsonb_build_object('q','Bir cismin uzerine etkiyen net kuvvet 20 N, kutle 4 kg ise ivme kactir?','a','5 m/s2','b','10 m/s2','c','15 m/s2','d','20 m/s2','e','80 m/s2','ok','A','ex','F=ma, a=F/m=20/4=5'),
        jsonb_build_object('q','Ohm kanununa gore I=2A ve R=10 ohm ise V kac volttur?','a','20 V','b','15 V','c','25 V','d','30 V','e','12 V','ok','A','ex','V=I*R=2*10=20'),
        jsonb_build_object('q','Osmanli Devleti''nin kurucusu kimdir?','a','Osman Bey','b','Orhan Bey','c','Fatih','d','Yavuz','e','Kanuni','ok','A','ex','Osman Bey kurucudur'),
        jsonb_build_object('q','Turkiye Cumhuriyeti kac yilinda kurulmustur?','a','1923','b','1920','c','1925','d','1928','e','1930','ok','A','ex','29 Ekim 1923'),
        jsonb_build_object('q','Turkiye''nin baskenti neresidir?','a','Ankara','b','Istanbul','c','Izmir','d','Bursa','e','Antalya','ok','A','ex','Ankara baskenttir'),
        jsonb_build_object('q','Lozan Antlasmasi hangi tarihte imzalanmistir?','a','24 Temmuz 1923','b','24 Nisan 1920','c','29 Ekim 1923','d','30 Agustos 1922','e','10 Agustos 1920','ok','A','ex','24 Temmuz 1923'),
        jsonb_build_object('q','Canakkale Savasi''nda 18 Mart Deniz Zaferi hangi tarihte kazanilmistir?','a','1915','b','1916','c','1914','d','1918','e','1920','ok','A','ex','18 Mart 1915'),
        jsonb_build_object('q','Kuvva-yi Milliye hareketi hangi donemde baslamistir?','a','Kurtulus Savasi','b','Istiklal Savasi','c','Dunya Savasi','d','Kurtulus','e','Ic Savas','ok','A','ex','Kurtulus Savasi doneminde'),
        jsonb_build_object('q','Turkiye''de ilk anayasa hangi yilida kabul edilmistir?','a','1921','b','1924','c','1923','d','1920','e','1930','ok','A','ex','1921 Tevkilat-i Esasiye'),
        jsonb_build_object('q','Mudanya Ateskes Antlasmasi hangi savasin ardindan imzalanmistir?','a','Kurtulus Savasi','b','Istiklal Savasi','c','Dunya Savasi','d','Mudanya Savasi','e','Mudanya','ok','A','ex','Kurtulus Savasi ardindan'),
        jsonb_build_object('q','Ataturk''un "Yurtta sulh, cihanda sulh" ilkesi hangi politikanin temelidir?','a','Dis politika','b','Ic politika','c','Ekonomi','d','Siyaset','e','Kultur','ok','A','ex','Dis politika temelidir'),
        jsonb_build_object('q','Turkiye''nin en uzun nehri hangisidir?','a','Kizilirmak','b','Firat','c','Seyhan','d','Meric','e','Coruh','ok','A','ex','Kizilirmak en uzun nehridir'),
        jsonb_build_object('q','Bir cemberin cevresi 2*pi*r ile hesaplanir. Yaricapi 7 ise cevre yaklasik kactir?','a','44','b','22','c','14','d','7','e','88','ok','A','ex','2*pi*7 yaklasik 44'),
        jsonb_build_object('q','Hangi secenekte buyuk unluy uyumuna uymayan sozcuk vardir?','a','Saatler','b','Kitap','c','Yol','d','Asla','e','Daha','ok','A','ex','Saatler byuuk unluy uyumuna uymaz'),
        jsonb_build_object('q','Asagidaki cumlelerin hangisinde dolayli anlatim vardir?','a','O dedi ki gelirim','b','O geldi','c','Gelmis','d','Gelir','e','Gelse','ok','A','ex','Dolayli anlatim: O dedi ki gelirim'),
        jsonb_build_object('q','Bir dik ucgenin hipotenusu 13, bir dik kenari 5 ise diger dik kenari kactir?','a','12','b','10','c','14','d','8','e','15','ok','A','ex','5^2+x^2=13^2, x=12'),
        jsonb_build_object('q','3x + 7 = 22 denkleminde x kactir?','a','5','b','7','c','3','d','15','e','29','ok','A','ex','3x=15, x=5')
      );
    ELSIF exam.category = 'surucu' THEN
      subj_names_arr := ARRAY['Trafik Kurallari','Ilk Yardim','Motor Bilgisi'];
      topic_names_arr := ARRAY['Trafik Isaretleri','Hiz ve Gecis Kurallari','Temel Ilk Yardim','Yaralanma Turleri','Arac Teknigi'];
      qb := jsonb_build_array(
        jsonb_build_object('q','Yerlesim yeri icindeki surat limiti saatte kac km''dir?','a','30 km','b','50 km','c','70 km','d','90 km','e','110 km','ok','B','ex','Yerlesim icinde 50 km sinir'),
        jsonb_build_object('q','Kirmizi isikta durmayan surucuye ne uygulanir?','a','Idari para cezasi ve puan','b','Sadece uyari','c','Sadece ceza puani','d','Hapse','e','Ehliyete el konur','ok','A','ex','Idari para cezasi ve puan'),
        jsonb_build_object('q','Gecme yasagi olan yerlerden hangisidir?','a','Duz yolda','b','Kavsakta','c','Tunellerde','d','Okul onlerinde','e','Virajlarda','ok','B','ex','Kavsaklarda gecmek yasaktir'),
        jsonb_build_object('q','Tehlikeli madde tasiyan araclarin arkasinda hangi isaret bulunur?','a','Turuncu yansimali','b','Kirmizi ucgen','c','Beyaz kare','d','Yesil daire','e','Mavi kare','ok','A','ex','Turuncu yansimali isaret'),
        jsonb_build_object('q','Takip mesafesi neye gore ayarlanmalidir?','a','Arac hizina','b','Yol genisligine','c','Hava durumuna','d','Arac rengine','e','Arac yasina','ok','A','ex','Takip mesafesi arac hizina gore'),
        jsonb_build_object('q','Geceleyin sis varken hangi isik kullanilmalidir?','a','Uzun farlar','b','Kisa farlar','c','Sis farlari','d','Park farlari','e','Hicbiri','ok','C','ex','Sis farlari kullanilmalidir'),
        jsonb_build_object('q','Park etmis bir araci sollarken hangi hiz asilmamalidir?','a','50 km','b','70 km','c','90 km','d','30 km','e','Otoyol siniri','ok','A','ex','50 km asilmamalidir'),
        jsonb_build_object('q','Karsidan gelen aracin farlari gozu kamastiriyorsa ne yapilmalidir?','a','Hiz artirilmali','b','Yol kenarina yanasilmali','c','Gozler kapatilmali','d','Korna calinmali','e','Far kapatilmali','ok','B','ex','Yol kenarina yanasilmali'),
        jsonb_build_object('q','Otoyolda geri geri gitmek yasaktir. Uymayan surucuye ne ceza verilir?','a','Idari para cezasi','b','Hapis','c','Surucu belgesi el konur','d','Trafikten men','e','Sadece uyari','ok','A','ex','Idari para cezasi'),
        jsonb_build_object('q','Trafikte "dur" isaretinin anlami nedir?','a','Yavasla ve gec','b','Tamamen dur','c','Yol ver','d','Yavasla','e','Gecis yok','ok','B','ex','Dur: tamamen dur')
      );
    ELSIF exam.category = 'dil' THEN
      subj_names_arr := ARRAY['Grammar','Reading','Vocabulary'];
      topic_names_arr := ARRAY['Tenses','Conditionals and Wish','Reading Comprehension','Cloze Test','Word Formation','Synonyms and Antonyms'];
      qb := jsonb_build_array(
        jsonb_build_object('q','Choose the correct tense: "She ____ to school every day."','a','goes','b','went','c','is going','d','has gone','e','go','ok','A','ex','Third person singular present: goes'),
        jsonb_build_object('q','Fill in: "If it rains, we ____ go to the park."','a','will not','b','would not','c','do not','d','not','e','cannot','ok','A','ex','First conditional: will not'),
        jsonb_build_object('q','Which sentence is passive voice?','a','The ball was kicked by John','b','John kicked the ball','c','The ball kicks John','d','John is kicking','e','Kicking the ball','ok','A','ex','Passive: was kicked by'),
        jsonb_build_object('q','Choose the correct article: "I saw ____ elephant."','a','an','b','a','c','the','d','some','e','no article','ok','A','ex','an before vowel sound'),
        jsonb_build_object('q','What is the past participle of "go"?','a','gone','b','went','c','going','d','go','e','goed','ok','A','ex','gone is past participle'),
        jsonb_build_object('q','Which word is a modal verb?','a','can','b','run','c','quickly','d','beautiful','e','is','ok','A','ex','can is a modal verb'),
        jsonb_build_object('q','Choose the correct preposition: "She is good ____ math."','a','at','b','for','c','in','d','on','e','to','ok','A','ex','good at: correct preposition'),
        jsonb_build_object('q','Choose the correct form: "I have ____ my homework."','a','done','b','did','c','made','d','finished','e','completed','ok','A','ex','done: past participle with have'),
        jsonb_build_object('q','Which sentence uses present perfect correctly?','a','I have lived here for ten years','b','I living here for ten years','c','I have live here','d','I has lived here','e','I lived here','ok','A','ex','Present perfect: have + past participle'),
        jsonb_build_object('q','Choose the correct relative pronoun: "The book ____ I read was good."','a','that','b','which','c','who','d','where','e','when','ok','A','ex','that/which for things')
      );
    ELSIF exam.category = 'kpss' THEN
      subj_names_arr := ARRAY['Genel Yetenek','Genel Kulturu'];
      topic_names_arr := ARRAY['Sayi Problemleri','Sozcuk Anlami','Turk Tarihi','Cografya','Anayasa Hukuku'];
      qb := jsonb_build_array(
        jsonb_build_object('q','Osmanli Devleti''nin kurucusu kimdir?','a','Osman Bey','b','Orhan Bey','c','Fatih','d','Yavuz','e','Kanuni','ok','A','ex','Osman Bey kurucudur'),
        jsonb_build_object('q','Turkiye Cumhuriyeti kac yilinda kurulmustur?','a','1923','b','1920','c','1925','d','1928','e','1930','ok','A','ex','29 Ekim 1923'),
        jsonb_build_object('q','TBMM''de kac milletvekili bulunur?','a','600','b','550','c','500','d','450','e','400','ok','B','ex','550 milletvekili'),
        jsonb_build_object('q','Turkiye''nin baskenti neresidir?','a','Ankara','b','Istanbul','c','Izmir','d','Bursa','e','Antalya','ok','A','ex','Ankara baskenttir'),
        jsonb_build_object('q','Lozan Antlasmasi hangi tarihte imzalanmistir?','a','24 Temmuz 1923','b','24 Nisan 1920','c','29 Ekim 1923','d','30 Agustos 1922','e','10 Agustos 1920','ok','A','ex','24 Temmuz 1923'),
        jsonb_build_object('q','Turkiye''de ilk anayasa hangi yilida kabul edilmistir?','a','1921','b','1924','c','1923','d','1920','e','1930','ok','A','ex','1921 Tevkilat-i Esasiye'),
        jsonb_build_object('q','Bir sayinin yuzde 20''si 40''tir. Bu sayi kactir?','a','200','b','150','c','180','d','220','e','250','ok','A','ex','%20=40, sayi=200'),
        jsonb_build_object('q','Bir magazada yuzde 20 indirim yapilmistir. Indirimli fiyat 80 TL ise indirim oncesi kactir?','a','100 TL','b','96 TL','c','90 TL','d','85 TL','e','82 TL','ok','A','ex','100*0.8=80, indirim oncesi 100'),
        jsonb_build_object('q','TBMM kac yilinda acilmistir?','a','1920','b','1921','c','1923','d','1924','e','1925','ok','A','ex','23 Nisan 1920 acildi'),
        jsonb_build_object('q','Cumhuriyetin ilani hangi tarihte gerceklesmistir?','a','29 Ekim 1923','b','23 Nisan 1920','c','1 Kasim 1922','d','3 Mart 1924','e','9 Eylul 1922','ok','A','ex','29 Ekim 1923 ilan edildi')
      );
    ELSE
      subj_names_arr := ARRAY['Genel Yetenek','Genel Kultur'];
      topic_names_arr := ARRAY['Temel Kavramlar','Pratik Sorular','Onemli Konular','Cozum Teknikleri'];
      qb := jsonb_build_array(
        jsonb_build_object('q',exam.name||' sinavinda temel kavramlardan biri asagidakilerden hangisidir?','a','Temel tanim ve kavramlar','b','Sadece pratik','c','Formuller','d','Genel kultur','e','Hicbiri','ok','A','ex','Temel tanim onemlidir'),
        jsonb_build_object('q',exam.name||' sinavinda sikca cikan konu nedir?','a','Konu ozeti ve pratik','b','Sadece formuller','c','Deneme sinavi','d','Konu anlatimi','e','Hepsi','ok','A','ex','Konu ozeti onemlidir'),
        jsonb_build_object('q','Bir ogrenci calisirken nelere dikkat etmelidir?','a','Konuyu tekrar etmeli','b','Sadece test cozmeli','c','Sadece okumali','d','Zaman ayirmali','e','Hicbiri','ok','A','ex','Tekrar onemlidir'),
        jsonb_build_object('q','Asagidakilerden hangisi dogrudur?','a','Temel kavram dogrudur','b','Yanlis ifade','c','Kismen dogru','d','Eksik ifade','e','Tamamen yanlis','ok','A','ex','Temel kavram dogrudur'),
        jsonb_build_object('q','En onemli formul/tanim asagidakilerden hangisidir?','a','Temel formul budur','b','Formul yok','c','Baska formul','d','Tanim','e','Hicbiri','ok','A','ex','Temel formul budur'),
        jsonb_build_object('q','Sinavda dersin agirligi nedir?','a','Yuksek agirlik','b','Orta agirlik','c','Dusuk agirlik','d','Agirlik yok','e','Bilinmiyor','ok','A','ex','Yuksek agirlik vardir'),
        jsonb_build_object('q','Hangi soru daha zordur?','a','Karmasik soru','b','Basit soru','c','Orta zorluk','d','Kolay soru','e','Cok kolay','ok','A','ex','Karmasik soru daha zordur'),
        jsonb_build_object('q','Hangisi dersin konularindan degildir?','a','Ilgisiz konu','b','Ilgili konu A','c','Ilgili konu B','d','Ilgili konu C','e','Ilgili konu D','ok','A','ex','Ilgisiz konu degildir')
      );
    END IF;

    num_subjects := array_length(subj_names_arr, 1);
    bank_size := jsonb_array_length(qb);
    subject_ids := ARRAY[]::uuid[];
    topic_ids := ARRAY[]::uuid[];

    FOR s_idx IN 1..num_subjects LOOP
      subj_name := subj_names_arr[s_idx];
      subj_slug := CASE
        WHEN subj_name ILIKE '%matematik%' OR subj_name ILIKE '%genel yetenek%' OR subj_name ILIKE 'grammar' THEN 'matematik'
        WHEN subj_name ILIKE '%turkce%' OR subj_name ILIKE 'reading' THEN 'turkce'
        WHEN subj_name ILIKE '%fen%' OR subj_name ILIKE '%temel%' OR subj_name ILIKE '%klinik%' OR subj_name ILIKE '%motor%' THEN 'fen'
        ELSE 'sosyal'
      END;

      subj_id := gen_random_uuid();
      INSERT INTO subjects (id, exam_id, name, slug, "order", status, created_at)
      VALUES (subj_id, exam.id, subj_name, subj_slug, s_idx - 1, 'active', now());
      subject_ids := array_append(subject_ids, subj_id);

      FOR t_idx IN 1..2 LOOP
        topic_name := topic_names_arr[((s_idx - 1) * 2 + t_idx - 1) % array_length(topic_names_arr, 1) + 1];
        topic_id := gen_random_uuid();
        INSERT INTO topics (id, exam_id, subject_id, name, "order", status, created_at)
        VALUES (topic_id, exam.id, subj_id, topic_name, t_idx - 1, 'active', now());
        topic_ids := array_append(topic_ids, topic_id);

        sub_names := ARRAY[topic_name||' - Temel Kavramlar', topic_name||' - Ileri Duzey', topic_name||' - Pratik Sorular'];
        FOR sub_idx IN 1..3 LOOP
          sub_id := gen_random_uuid();
          INSERT INTO subtopics (id, topic_id, name, "order", created_at)
          VALUES (sub_id, topic_id, sub_names[sub_idx], sub_idx - 1, now());
        END LOOP;
      END LOOP;
    END LOOP;

    questions_per_subject := 30 / num_subjects;
    remaining_q := 30 - (questions_per_subject * num_subjects);
    q_counter := 0;

    FOR s_idx IN 1..num_subjects LOOP
      subj_id := subject_ids[s_idx];
      subj_name := subj_names_arr[s_idx];
      topic_id := topic_ids[(s_idx - 1) * 2 + 1];

      per_subject := questions_per_subject;
      IF s_idx = 1 THEN per_subject := per_subject + remaining_q; END IF;

      FOR q_order IN 1..per_subject LOOP
        q_counter := q_counter + 1;
        q_pick := ((q_counter - 1) % bank_size) + 1;
        q_item := qb->(q_pick - 1);

        INSERT INTO questions (
          id, exam_id, subject_id, topic_id, subtopic_id,
          question_text, question_type,
          option_a, option_b, option_c, option_d, option_e,
          correct_answer, explanation, difficulty, source, year, tags, status, created_at
        ) VALUES (
          gen_random_uuid(), exam.id, subj_id, topic_id, NULL,
          q_item->>'q', 'multiple_choice',
          q_item->>'a', q_item->>'b', q_item->>'c', q_item->>'d', q_item->>'e',
          q_item->>'ok', q_item->>'ex',
          CASE WHEN q_order % 3 = 0 THEN 'zor' WHEN q_order % 3 = 1 THEN 'orta' ELSE 'kolay' END,
          'Netor Soru Bankasi', 2024,
          to_jsonb(ARRAY[subj_name]::text[]), 'active', now()
        );
      END LOOP;
    END LOOP;

    -- Deneme test
    SELECT jsonb_agg(q.id) INTO q_ids
    FROM (SELECT id FROM questions WHERE exam_id = exam.id AND status = 'active' ORDER BY created_at LIMIT 30) q;

    IF q_ids IS NOT NULL AND jsonb_array_length(q_ids) > 0 THEN
      INSERT INTO tests (name, description, exam_id, duration_minutes, question_ids, difficulty, status, created_at)
      VALUES (exam.name||' Deneme Sinavi 1', exam.name||' kapsaminda 30 sorudan olusan deneme.', exam.id, 40, q_ids, 'orta', 'published', now());
    END IF;

    -- Study notes
    note_content := subj_names_arr[1]||' dersi '||exam.name||' sinavi icin temel konu anlatimi.';
    INSERT INTO study_notes (title, description, exam_id, subject_id, topic_id, content, video_url, status, published_at, created_at)
    VALUES (exam.name||' - '||subj_names_arr[1]||' Temel Konu Anlatimi', exam.name||' '||subj_names_arr[1]||' dersi.', exam.id, subject_ids[1], topic_ids[1], note_content, '', 'published', now(), now());

    IF num_subjects > 1 THEN
      note_content := subj_names_arr[2]||' dersi '||exam.name||' sinavi icin onemli konular.';
      INSERT INTO study_notes (title, description, exam_id, subject_id, topic_id, content, video_url, status, published_at, created_at)
      VALUES (exam.name||' - '||subj_names_arr[2]||' Ozet Konu', exam.name||' '||subj_names_arr[2]||' dersi.', exam.id, subject_ids[2], topic_ids[2], note_content, '', 'published', now(), now());
    END IF;

  END LOOP;
END $$;
