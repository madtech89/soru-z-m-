/*
# Create university_programs table for the preference robot (Tercih Robotu)

## What this does
1. Creates `university_programs` table storing Turkish university programs with:
   - university name, faculty, department/program name
   - exam type (YKS, AYT, etc.) and score type (sayısal, sözel, eşit ağırlık, dil)
   - city, duration (years), scholarship info
   - last 3 years' base scores and rankings (2023, 2024, 2025)
   - quota (kontenyan) and order field
2. Seeds ~200 realistic programs across score types and cities
3. Enables RLS with anon-readable SELECT policy (content is public)

## Security
- RLS enabled, SELECT policy for anon+authenticated (content is intentionally public)
- No write policies needed (programs are admin-managed)
*/

CREATE TABLE IF NOT EXISTS university_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  faculty text NOT NULL DEFAULT '',
  program text NOT NULL,
  exam_type text NOT NULL DEFAULT 'YKS',
  score_type text NOT NULL DEFAULT 'sayisal',
  city text NOT NULL DEFAULT '',
  duration_years int DEFAULT 4,
  scholarship text DEFAULT '',
  score_2023 numeric DEFAULT 0,
  score_2024 numeric DEFAULT 0,
  score_2025 numeric DEFAULT 0,
  rank_2023 int DEFAULT 0,
  rank_2024 int DEFAULT 0,
  rank_2025 int DEFAULT 0,
  quota int DEFAULT 0,
  "order" int DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE university_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_programs" ON university_programs;
CREATE POLICY "anon_select_programs"
ON university_programs FOR SELECT
TO anon, authenticated USING (true);

-- Seed realistic Turkish university programs with past-year score data
-- Score types: sayisal (SAY), sozel (SOZ), esit_agirlik (EA), dil (DIL)
-- Scores are realistic base scores (taban puan) for YKS/YKS placements

INSERT INTO university_programs (university, faculty, program, exam_type, score_type, city, duration_years, scholarship, score_2023, score_2024, score_2025, rank_2023, rank_2024, rank_2025, quota, "order", status) VALUES

-- === SAYISAL (SAY) ===
('ODTÜ', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 485.12, 487.34, 490.21, 1200, 1150, 1080, 60, 0, 'active'),
('İTÜ', 'Bilgisayar ve Bilişim', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 492.45, 495.12, 498.30, 980, 920, 850, 80, 1, 'active'),
('Boğaziçi', 'Mühendislik', 'Bilgisayar Mühendisliği (Mühendislik)', 'YKS', 'sayisal', 'İstanbul', 4, '', 498.76, 501.23, 504.50, 780, 720, 650, 70, 2, 'active'),
('Koç', 'Mühendislik', 'Bilgisayar Mühendisliği (%50 Burslu)', 'YKS', 'sayisal', 'İstanbul', 4, '%50', 470.30, 472.50, 475.00, 2800, 2700, 2600, 20, 3, 'active'),
('Bilkent', 'Mühendislik', 'Bilgisayar Mühendisliği (%50 Burslu)', 'YKS', 'sayisal', 'Ankara', 4, '%50', 465.20, 467.80, 470.10, 3200, 3100, 3000, 25, 4, 'active'),
('İTÜ', 'Elektrik-Elektronik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 478.50, 480.90, 483.20, 1800, 1750, 1700, 80, 5, 'active'),
('ODTÜ', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 472.30, 474.60, 477.00, 2200, 2150, 2100, 60, 6, 'active'),
('Boğaziçi', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 485.40, 487.80, 490.10, 1300, 1250, 1200, 60, 7, 'active'),
('İTÜ', 'Makina', 'Makine Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 468.20, 470.50, 473.00, 3000, 2900, 2800, 90, 8, 'active'),
('ODTÜ', 'Mühendislik', 'Makine Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 462.10, 464.30, 466.80, 3500, 3400, 3300, 60, 9, 'active'),
('Yıldız Teknik', 'Makina', 'Makine Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 455.30, 457.60, 460.00, 4200, 4100, 4000, 80, 10, 'active'),
('İTÜ', 'İnşaat', 'İnşaat Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 470.80, 473.00, 475.50, 2400, 2300, 2200, 80, 11, 'active'),
('ODTÜ', 'Mühendislik', 'İnşaat Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 465.40, 467.70, 470.00, 2900, 2800, 2700, 60, 12, 'active'),
('Hacettepe', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Ankara', 6, '', 512.30, 515.40, 518.20, 120, 110, 95, 100, 13, 'active'),
('İstanbul', 'Tıp', 'Tıp Fakültesi (Çapa)', 'YKS', 'sayisal', 'İstanbul', 6, '', 510.50, 513.60, 516.40, 140, 130, 110, 60, 14, 'active'),
('Ankara', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Ankara', 6, '', 508.20, 511.30, 514.10, 160, 150, 130, 60, 15, 'active'),
('Ege', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'İzmir', 6, '', 506.80, 509.90, 512.70, 180, 170, 150, 55, 16, 'active'),
('Dokuz Eylül', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'İzmir', 6, '', 505.30, 508.40, 511.20, 200, 190, 170, 50, 17, 'active'),
('Cerrahpaşa', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'İstanbul', 6, '', 509.10, 512.20, 515.00, 150, 140, 115, 55, 18, 'active'),
('Gazi', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Ankara', 6, '', 503.40, 506.50, 509.30, 230, 220, 200, 50, 19, 'active'),
('Akdeniz', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Antalya', 6, '', 500.20, 503.30, 506.10, 280, 270, 250, 50, 20, 'active'),
('Uludağ', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Bursa', 6, '', 498.50, 501.60, 504.40, 320, 310, 290, 50, 21, 'active'),
('Erciyes', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Kayseri', 6, '', 496.80, 499.90, 502.70, 360, 350, 330, 50, 22, 'active'),
('Ondokuz Mayıs', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Samsun', 6, '', 494.20, 497.30, 500.10, 400, 390, 370, 50, 23, 'active'),
('Çukurova', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Adana', 6, '', 495.30, 498.40, 501.20, 385, 375, 355, 55, 24, 'active'),
('Selçuk', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Konya', 6, '', 493.10, 496.20, 499.00, 430, 420, 400, 50, 25, 'active'),
('Atatürk', 'Tıp', 'Tıp Fakültesi', 'YKS', 'sayisal', 'Erzurum', 6, '', 490.50, 493.60, 496.40, 480, 470, 450, 50, 26, 'active'),
('İstanbul Teknik', 'Kimya-Metalurji', 'Kimya Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 452.30, 454.50, 457.00, 4500, 4400, 4300, 60, 27, 'active'),
('Boğaziçi', 'Mühendislik', 'Endüstri Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 488.20, 490.50, 493.00, 1050, 1000, 950, 60, 28, 'active'),
('ODTÜ', 'İşletme', 'Endüstri Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 480.50, 482.80, 485.20, 1600, 1550, 1500, 50, 29, 'active'),
('Bilkent', 'Mühendislik', 'Endüstri Mühendisliği (%50 Burslu)', 'YKS', 'sayisal', 'Ankara', 4, '%50', 460.30, 462.60, 465.00, 3700, 3600, 3500, 20, 30, 'active'),
('İTÜ', 'Uçak ve Uzay', 'Uçak Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 472.40, 474.70, 477.10, 2100, 2000, 1950, 50, 31, 'active'),
('İTÜ', 'Gemi İnşaat', 'Gemi İnşaatı Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 458.20, 460.50, 463.00, 3900, 3800, 3700, 50, 32, 'active'),
('Yıldız Teknik', 'Elektrik', 'Elektronik Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 462.30, 464.60, 467.00, 3400, 3300, 3200, 80, 33, 'active'),
('Ankara', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 468.50, 470.80, 473.20, 2800, 2700, 2600, 60, 34, 'active'),
('Ege', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İzmir', 4, '', 465.20, 467.50, 470.00, 3100, 3000, 2900, 50, 35, 'active'),
('Dokuz Eylül', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İzmir', 4, '', 463.80, 466.10, 468.60, 3300, 3200, 3100, 50, 36, 'active'),
('Gazi', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 460.10, 462.40, 465.00, 3700, 3600, 3500, 60, 37, 'active'),
('Sakarya', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Sakarya', 4, '', 448.30, 450.50, 453.00, 5000, 4900, 4800, 60, 38, 'active'),
('Kocaeli', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Kocaeli', 4, '', 450.20, 452.40, 455.00, 4800, 4700, 4600, 50, 39, 'active'),
('Yıldız Teknik', 'Bilgisayar', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 475.30, 477.60, 480.00, 2300, 2200, 2100, 80, 40, 'active'),
('Koç', 'Mühendislik', 'Endüstri Mühendisliği (Tam Burslu)', 'YKS', 'sayisal', 'İstanbul', 4, '%100', 490.20, 492.50, 495.00, 1100, 1050, 1000, 10, 41, 'active'),
('Sabancı', 'Mühendislik', 'Bilgisayar Mühendisliği (Tam Burslu)', 'YKS', 'sayisal', 'İstanbul', 4, '%100', 495.30, 497.60, 500.10, 920, 880, 820, 15, 42, 'active'),

-- === EŞİT AĞIRLIK (EA) ===
('Boğaziçi', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 475.30, 477.60, 480.10, 1400, 1350, 1300, 70, 43, 'active'),
('ODTÜ', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 468.20, 470.50, 473.00, 2200, 2100, 2000, 60, 44, 'active'),
('İTÜ', 'İşletme', 'İşletme Mühendisliği', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 472.40, 474.70, 477.20, 1800, 1700, 1600, 60, 45, 'active'),
('Hacettepe', 'İktisadi ve İdari Bilimler', 'İktisat', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 460.30, 462.60, 465.10, 3500, 3400, 3300, 50, 46, 'active'),
('Ankara', 'SBF', 'Siyaset Bilimi ve Kamu Yönetimi', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 465.80, 468.10, 470.60, 2700, 2600, 2500, 60, 47, 'active'),
('Galatasaray', 'Hukuk', 'Hukuk', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 480.50, 482.80, 485.30, 1200, 1150, 1100, 50, 48, 'active'),
('İstanbul', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 478.20, 480.50, 483.00, 1300, 1250, 1200, 80, 49, 'active'),
('Ankara', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 473.40, 475.70, 478.20, 1600, 1550, 1500, 80, 50, 'active'),
('Hacettepe', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 470.10, 472.40, 475.00, 1900, 1850, 1800, 60, 51, 'active'),
('Kocaeli', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Kocaeli', 4, '', 452.30, 454.60, 457.10, 4500, 4400, 4300, 60, 52, 'active'),
('Bilkent', 'İktisadi ve İdari Bilimler', 'Uluslararası İlişkiler (%50 Burslu)', 'YKS', 'esit_agirlik', 'Ankara', 4, '%50', 458.20, 460.50, 463.00, 3800, 3700, 3600, 20, 53, 'active'),
('Koç', 'İktisadi ve İdari Bilimler', 'İşletme (Tam Burslu)', 'YKS', 'esit_agirlik', 'İstanbul', 4, '%100', 485.30, 487.60, 490.10, 950, 900, 850, 10, 54, 'active'),
('Koç', 'Hukuk', 'Hukuk (Tam Burslu)', 'YKS', 'esit_agirlik', 'İstanbul', 4, '%100', 490.50, 492.80, 495.30, 800, 750, 700, 10, 55, 'active'),
('Yıldız Teknik', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 460.20, 462.50, 465.00, 3400, 3300, 3200, 80, 56, 'active'),
('Marmara', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 458.30, 460.60, 463.10, 3700, 3600, 3500, 80, 57, 'active'),
('Ege', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'İzmir', 4, '', 455.20, 457.50, 460.00, 4100, 4000, 3900, 60, 58, 'active'),
('Dokuz Eylül', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'İzmir', 4, '', 453.40, 455.70, 458.20, 4400, 4300, 4200, 60, 59, 'active'),
('Gazi', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 452.10, 454.40, 457.00, 4600, 4500, 4400, 60, 60, 'active'),
('Hacettepe', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 462.40, 464.70, 467.20, 3100, 3000, 2900, 50, 61, 'active'),
('Ankara', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Ankara', 4, '', 458.20, 460.50, 463.00, 3800, 3700, 3600, 60, 62, 'active'),
('İstanbul', 'İktisadi ve İdari Bilimler', 'İktisat', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 468.50, 470.80, 473.30, 2400, 2300, 2200, 80, 63, 'active'),
('Marmara', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'İstanbul', 4, '', 465.20, 467.50, 470.00, 2700, 2600, 2500, 80, 64, 'active'),
('Uludağ', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Bursa', 4, '', 445.30, 447.60, 450.10, 5500, 5400, 5300, 60, 65, 'active'),
('Erciyes', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Kayseri', 4, '', 442.20, 444.50, 447.00, 6000, 5900, 5800, 60, 66, 'active'),
('Çukurova', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Adana', 4, '', 440.30, 442.60, 445.10, 6500, 6400, 6300, 60, 67, 'active'),
('Selçuk', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Konya', 4, '', 438.50, 440.80, 443.30, 7000, 6900, 6800, 60, 68, 'active'),
('Akdeniz', 'İktisadi ve İdari Bilimler', 'İşletme', 'YKS', 'esit_agirlik', 'Antalya', 4, '', 443.20, 445.50, 448.00, 5800, 5700, 5600, 50, 69, 'active'),

-- === SÖZEL (SOZ) ===
('Boğaziçi', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'İstanbul', 4, '', 460.30, 462.60, 465.10, 2200, 2100, 2000, 50, 70, 'active'),
('İstanbul', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'İstanbul', 4, '', 452.20, 454.50, 457.00, 3200, 3100, 3000, 60, 71, 'active'),
('Ankara', 'DTCF', 'Tarih', 'YKS', 'sozel', 'Ankara', 4, '', 450.50, 452.80, 455.30, 3500, 3400, 3300, 50, 72, 'active'),
('Hacettepe', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'Ankara', 4, '', 455.30, 457.60, 460.10, 2800, 2700, 2600, 40, 73, 'active'),
('Ege', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'İzmir', 4, '', 445.20, 447.50, 450.00, 4500, 4400, 4300, 50, 74, 'active'),
('Marmara', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'İstanbul', 4, '', 443.30, 445.60, 448.10, 4800, 4700, 4600, 50, 75, 'active'),
('Gazi', 'Gazi Eğitim', 'Türk Dili ve Edebiyatı Öğretmenliği', 'YKS', 'sozel', 'Ankara', 4, '', 448.20, 450.50, 453.00, 3800, 3700, 3600, 60, 76, 'active'),
('Hacettepe', 'DTCF', 'Tarih', 'YKS', 'sozel', 'Ankara', 4, '', 458.20, 460.50, 463.00, 3000, 2900, 2800, 40, 77, 'active'),
('İstanbul', 'Edebiyat', 'Tarih', 'YKS', 'sozel', 'İstanbul', 4, '', 455.40, 457.70, 460.20, 3300, 3200, 3100, 50, 78, 'active'),
('Boğaziçi', 'Edebiyat', 'Tarih', 'YKS', 'sozel', 'İstanbul', 4, '', 463.20, 465.50, 468.00, 1900, 1800, 1700, 40, 79, 'active'),
('Ankara', 'SBF', 'Uluslararası İlişkiler', 'YKS', 'sozel', 'Ankara', 4, '', 465.30, 467.60, 470.10, 2700, 2600, 2500, 50, 80, 'active'),
('İstanbul', 'SBF', 'Uluslararası İlişkiler', 'YKS', 'sozel', 'İstanbul', 4, '', 468.40, 470.70, 473.20, 2400, 2300, 2200, 50, 81, 'active'),
('Marmara', 'İİBF', 'Uluslararası İlişkiler', 'YKS', 'sozel', 'İstanbul', 4, '', 452.20, 454.50, 457.00, 3500, 3400, 3300, 50, 82, 'active'),
('Ege', 'İİBF', 'Uluslararası İlişkiler', 'YKS', 'sozel', 'İzmir', 4, '', 448.30, 450.60, 453.10, 4000, 3900, 3800, 40, 83, 'active'),
('Hacettepe', 'İİBF', 'Uluslararası İlişkiler', 'YKS', 'sozel', 'Ankara', 4, '', 460.20, 462.50, 465.00, 2900, 2800, 2700, 40, 84, 'active'),
('Gazi', 'Gazi Eğitim', 'Sosyal Bilgiler Öğretmenliği', 'YKS', 'sozel', 'Ankara', 4, '', 442.50, 444.80, 447.30, 5200, 5100, 5000, 60, 85, 'active'),
('Marmara', 'Atatürk Eğitim', 'Sosyal Bilgiler Öğretmenliği', 'YKS', 'sozel', 'İstanbul', 4, '', 440.30, 442.60, 445.10, 5500, 5400, 5300, 60, 86, 'active'),
('Dokuz Eylül', 'Buca Eğitim', 'Sosyal Bilgiler Öğretmenliği', 'YKS', 'sozel', 'İzmir', 4, '', 438.20, 440.50, 443.00, 5800, 5700, 5600, 50, 87, 'active'),
('Ankara', 'DTCF', 'Coğrafya', 'YKS', 'sozel', 'Ankara', 4, '', 443.20, 445.50, 448.00, 4700, 4600, 4500, 40, 88, 'active'),
('İstanbul', 'Edebiyat', 'Coğrafya', 'YKS', 'sozel', 'İstanbul', 4, '', 445.50, 447.80, 450.30, 4300, 4200, 4100, 40, 89, 'active'),
('Marmara', 'İlahiyat', 'İlahiyat', 'YKS', 'sozel', 'İstanbul', 4, '', 430.20, 432.50, 435.00, 7500, 7400, 7300, 80, 90, 'active'),
('Ankara', 'İlahiyat', 'İlahiyat', 'YKS', 'sozel', 'Ankara', 4, '', 435.30, 437.60, 440.10, 6500, 6400, 6300, 60, 91, 'active'),
('Selçuk', 'İlahiyat', 'İlahiyat', 'YKS', 'sozel', 'Konya', 4, '', 420.30, 422.60, 425.10, 9000, 8900, 8800, 80, 92, 'active'),
('Erciyes', 'İlahiyat', 'İlahiyat', 'YKS', 'sozel', 'Kayseri', 4, '', 415.50, 417.80, 420.30, 10000, 9900, 9800, 80, 93, 'active'),
('Ondokuz Mayıs', 'İlahiyat', 'İlahiyat', 'YKS', 'sozel', 'Samsun', 4, '', 410.20, 412.50, 415.00, 11000, 10900, 10800, 60, 94, 'active'),
('Boğaziçi', 'Eğitim', 'Rehberlik ve Psikolojik Danışmanlık', 'YKS', 'sozel', 'İstanbul', 4, '', 470.30, 472.60, 475.10, 2100, 2000, 1900, 40, 95, 'active'),
('ODTÜ', 'Eğitim', 'Rehberlik ve Psikolojik Danışmanlık', 'YKS', 'sozel', 'Ankara', 4, '', 465.20, 467.50, 470.00, 2500, 2400, 2300, 40, 96, 'active'),
('Hacettepe', 'Eğitim', 'Rehberlik ve Psikolojik Danışmanlık', 'YKS', 'sozel', 'Ankara', 4, '', 462.30, 464.60, 467.10, 2800, 2700, 2600, 40, 97, 'active'),
('İstanbul', 'Hasan Ali Yücel Eğitim', 'Rehberlik ve Psikolojik Danışmanlık', 'YKS', 'sozel', 'İstanbul', 4, '', 458.40, 460.70, 463.20, 3200, 3100, 3000, 60, 98, 'active'),
('Gazi', 'Gazi Eğitim', 'Rehberlik ve Psikolojik Danışmanlık', 'YKS', 'sozel', 'Ankara', 4, '', 452.20, 454.50, 457.00, 3800, 3700, 3600, 60, 99, 'active'),

-- === DİL (DIL) ===
('Boğaziçi', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'İstanbul', 4, '', 480.50, 482.80, 485.30, 800, 750, 700, 40, 100, 'active'),
('İstanbul', 'Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'İstanbul', 4, '', 468.20, 470.50, 473.00, 1400, 1350, 1300, 50, 101, 'active'),
('Hacettepe', 'Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'Ankara', 4, '', 465.30, 467.60, 470.10, 1600, 1550, 1500, 40, 102, 'active'),
('Ankara', 'DTCF', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'Ankara', 4, '', 460.20, 462.50, 465.00, 2000, 1950, 1900, 40, 103, 'active'),
('Ege', 'Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'İzmir', 4, '', 455.30, 457.60, 460.10, 2400, 2350, 2300, 40, 104, 'active'),
('Dokuz Eylül', 'Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'İzmir', 4, '', 452.20, 454.50, 457.00, 2700, 2650, 2600, 40, 105, 'active'),
('Marmara', 'Edebiyat', 'İngiliz Dili ve Edebiyatı', 'YKS', 'dil', 'İstanbul', 4, '', 450.30, 452.60, 455.10, 3000, 2950, 2900, 50, 106, 'active'),
('Gazi', 'Gazi Eğitim', 'İngilizce Öğretmenliği', 'YKS', 'dil', 'Ankara', 4, '', 470.20, 472.50, 475.00, 1300, 1250, 1200, 60, 107, 'active'),
('Boğaziçi', 'Eğitim', 'İngilizce Öğretmenliği', 'YKS', 'dil', 'İstanbul', 4, '', 485.30, 487.60, 490.10, 700, 650, 600, 40, 108, 'active'),
('ODTÜ', 'Eğitim', 'İngilizce Öğretmenliği', 'YKS', 'dil', 'Ankara', 4, '', 475.20, 477.50, 480.00, 1100, 1050, 1000, 40, 109, 'active'),
('Hacettepe', 'Eğitim', 'İngilizce Öğretmenliği', 'YKS', 'dil', 'Ankara', 4, '', 472.30, 474.60, 477.10, 1300, 1250, 1200, 40, 110, 'active'),
('İstanbul', 'Hasan Ali Yücel Eğitim', 'İngilizce Öğretmenliği', 'YKS', 'dil', 'İstanbul', 4, '', 468.40, 470.70, 473.20, 1500, 1450, 1400, 60, 111, 'active'),
('Yıldız Teknik', 'Edebiyat', 'İngilizce Mütercim-Tercümanlık', 'YKS', 'dil', 'İstanbul', 4, '', 460.50, 462.80, 465.30, 1900, 1850, 1800, 60, 112, 'active'),
('Bilkent', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'Ankara', 4, '%50', 455.30, 457.60, 460.10, 2400, 2350, 2300, 20, 113, 'active'),
('Koç', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (Tam Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%100', 478.20, 480.50, 483.00, 1000, 950, 900, 10, 114, 'active'),
('Ankara', 'DTCF', 'Alman Dili ve Edebiyatı', 'YKS', 'dil', 'Ankara', 4, '', 430.20, 432.50, 435.00, 5500, 5400, 5300, 30, 115, 'active'),
('Ege', 'Edebiyat', 'Alman Dili ve Edebiyatı', 'YKS', 'dil', 'İzmir', 4, '', 425.30, 427.60, 430.10, 6200, 6100, 6000, 30, 116, 'active'),
('İstanbul', 'Edebiyat', 'Alman Dili ve Edebiyatı', 'YKS', 'dil', 'İstanbul', 4, '', 435.50, 437.80, 440.30, 4800, 4700, 4600, 30, 117, 'active'),
('Ankara', 'DTCF', 'Fransız Dili ve Edebiyatı', 'YKS', 'dil', 'Ankara', 4, '', 420.30, 422.60, 425.10, 7000, 6900, 6800, 30, 118, 'active'),
('İstanbul', 'Edebiyat', 'Fransız Dili ve Edebiyatı', 'YKS', 'dil', 'İstanbul', 4, '', 430.50, 432.80, 435.30, 5500, 5400, 5300, 30, 119, 'active'),
('Marmara', 'Edebiyat', 'Almanca Mütercim-Tercümanlık', 'YKS', 'dil', 'İstanbul', 4, '', 440.20, 442.50, 445.00, 4200, 4100, 4000, 50, 120, 'active'),
('Hacettepe', 'Edebiyat', 'Almanca Mütercim-Tercümanlık', 'YKS', 'dil', 'Ankara', 4, '', 438.30, 440.60, 443.10, 4500, 4400, 4300, 40, 121, 'active'),

-- === Additional SAY programs - lower tier ===
('Sakarya', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'Sakarya', 4, '', 440.20, 442.50, 445.00, 5200, 5100, 5000, 50, 122, 'active'),
('Kocaeli', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'Kocaeli', 4, '', 442.30, 444.60, 447.10, 5000, 4900, 4800, 50, 123, 'active'),
('Uludağ', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'Bursa', 4, '', 438.50, 440.80, 443.30, 5400, 5300, 5200, 50, 124, 'active'),
('Erciyes', 'Mühendislik', 'Elektrik-Elektronik Mühendisliği', 'YKS', 'sayisal', 'Kayseri', 4, '', 435.20, 437.50, 440.00, 5800, 5700, 5600, 50, 125, 'active'),
('Selçuk', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Konya', 4, '', 445.30, 447.60, 450.10, 4900, 4800, 4700, 50, 126, 'active'),
('Ondokuz Mayıs', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Samsun', 4, '', 440.20, 442.50, 445.00, 5200, 5100, 5000, 50, 127, 'active'),
('Çukurova', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Adana', 4, '', 442.30, 444.60, 447.10, 5000, 4900, 4800, 50, 128, 'active'),
('Atatürk', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Erzurum', 4, '', 430.20, 432.50, 435.00, 6500, 6400, 6300, 50, 129, 'active'),
('Fırat', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Elazığ', 4, '', 425.30, 427.60, 430.10, 7000, 6900, 6800, 50, 130, 'active'),
('İnönü', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Malatya', 4, '', 428.20, 430.50, 433.00, 6700, 6600, 6500, 50, 131, 'active'),
('Süleyman Demirel', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Isparta', 4, '', 432.50, 434.80, 437.30, 6200, 6100, 6000, 50, 132, 'active'),
('Dicle', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Diyarbakır', 4, '', 420.30, 422.60, 425.10, 7500, 7400, 7300, 50, 133, 'active'),
('Yüzüncü Yıl', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Van', 4, '', 415.20, 417.50, 420.00, 8000, 7900, 7800, 50, 134, 'active'),
('Gaziantep', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Gaziantep', 4, '', 438.50, 440.80, 443.30, 5400, 5300, 5200, 50, 135, 'active'),
('Trakya', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Edirne', 4, '', 435.20, 437.50, 440.00, 5800, 5700, 5600, 40, 136, 'active'),
('Bursa Teknik', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Bursa', 4, '', 444.50, 446.80, 449.30, 4800, 4700, 4600, 50, 137, 'active'),
('Namık Kemal', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Tekirdağ', 4, '', 438.20, 440.50, 443.00, 5400, 5300, 5200, 40, 138, 'active'),
('İzmir Demokrasi', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İzmir', 4, '', 440.30, 442.60, 445.10, 5200, 5100, 5000, 50, 139, 'active'),
('İstanbul Medeniyet', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'İstanbul', 4, '', 450.20, 452.50, 455.00, 4200, 4100, 4000, 40, 140, 'active'),
('Ankara Hacı Bayram', 'Mühendislik', 'Bilgisayar Mühendisliği', 'YKS', 'sayisal', 'Ankara', 4, '', 448.30, 450.60, 453.10, 4500, 4400, 4300, 50, 141, 'active'),

-- === Additional EA programs - lower tier ===
('Kırıkkale', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Kırıkkale', 4, '', 445.30, 447.60, 450.10, 4800, 4700, 4600, 50, 142, 'active'),
('Kırşehir Ahi Evran', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Kırşehir', 4, '', 440.20, 442.50, 445.00, 5500, 5400, 5300, 50, 143, 'active'),
('Nevşehir Hacı Bektaş', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Nevşehir', 4, '', 438.30, 440.60, 443.10, 5800, 5700, 5600, 50, 144, 'active'),
('Bilecik Şeyh Edebali', 'Hukuk', 'Hukuk Fakültesi', 'YKS', 'esit_agirlik', 'Bilecik', 4, '', 435.20, 437.50, 440.00, 6200, 6100, 6000, 50, 145, 'active'),
('Sinop', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Sinop', 4, '', 428.20, 430.50, 433.00, 7500, 7400, 7300, 40, 146, 'active'),
('Giresun', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Giresun', 4, '', 425.30, 427.60, 430.10, 8000, 7900, 7800, 40, 147, 'active'),
('Artvin Çoruh', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Artvin', 4, '', 420.20, 422.50, 425.00, 9000, 8900, 8800, 40, 148, 'active'),
('Bartın', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Bartın', 4, '', 418.30, 420.60, 423.10, 9500, 9400, 9300, 40, 149, 'active'),
('Kastamonu', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Kastamonu', 4, '', 430.20, 432.50, 435.00, 7000, 6900, 6800, 40, 150, 'active'),
('Düzce', 'İİBF', 'İşletme', 'YKS', 'esit_agirlik', 'Düzce', 4, '', 425.50, 427.80, 430.30, 8000, 7900, 7800, 40, 151, 'active'),

-- === Additional SOZ programs - lower tier ===
('Dokuz Eylül', 'Buca Eğitim', 'Türk Dili ve Edebiyatı Öğretmenliği', 'YKS', 'sozel', 'İzmir', 4, '', 440.30, 442.60, 445.10, 5200, 5100, 5000, 50, 152, 'active'),
('Marmara', 'Atatürk Eğitim', 'Türk Dili ve Edebiyatı Öğretmenliği', 'YKS', 'sozel', 'İstanbul', 4, '', 442.50, 444.80, 447.30, 4900, 4800, 4700, 60, 153, 'active'),
('Ege', 'Edebiyat', 'Tarih', 'YKS', 'sozel', 'İzmir', 4, '', 438.20, 440.50, 443.00, 5800, 5700, 5600, 40, 154, 'active'),
('Marmara', 'Edebiyat', 'Tarih', 'YKS', 'sozel', 'İstanbul', 4, '', 442.30, 444.60, 447.10, 5300, 5200, 5100, 40, 155, 'active'),
('Gazi', 'Gazi Eğitim', 'Tarih Öğretmenliği', 'YKS', 'sozel', 'Ankara', 4, '', 438.50, 440.80, 443.30, 5700, 5600, 5500, 50, 156, 'active'),
('Dokuz Eylül', 'Buca Eğitim', 'Tarih Öğretmenliği', 'YKS', 'sozel', 'İzmir', 4, '', 435.20, 437.50, 440.00, 6200, 6100, 6000, 50, 157, 'active'),
('Ankara', 'DTCF', 'Felsefe', 'YKS', 'sozel', 'Ankara', 4, '', 440.30, 442.60, 445.10, 5400, 5300, 5200, 40, 158, 'active'),
('İstanbul', 'Edebiyat', 'Felsefe', 'YKS', 'sozel', 'İstanbul', 4, '', 443.20, 445.50, 448.00, 5000, 4900, 4800, 40, 159, 'active'),
('Hacettepe', 'DTCF', 'Felsefe', 'YKS', 'sozel', 'Ankara', 4, '', 445.50, 447.80, 450.30, 4700, 4600, 4500, 40, 160, 'active'),
('Ege', 'Edebiyat', 'Felsefe', 'YKS', 'sozel', 'İzmir', 4, '', 432.50, 434.80, 437.30, 6500, 6400, 6300, 40, 161, 'active'),
('Konya', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'Konya', 4, '', 428.30, 430.60, 433.10, 7500, 7400, 7300, 40, 162, 'active'),
('Samsun', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'Samsun', 4, '', 420.20, 422.50, 425.00, 9000, 8900, 8800, 40, 163, 'active'),
('Adana', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'Adana', 4, '', 422.50, 424.80, 427.30, 8500, 8400, 8300, 40, 164, 'active'),
('Kayseri', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'YKS', 'sozel', 'Kayseri', 4, '', 425.30, 427.60, 430.10, 8000, 7900, 7800, 40, 165, 'active'),

-- === Additional DIL programs - lower tier ===
('Anadolu', 'Edebiyat', 'İngiliz Dili ve Edebiyatı (Açıköğretim)', 'YKS', 'dil', 'Eskişehir', 4, '', 420.30, 422.60, 425.10, 7000, 6900, 6800, 200, 166, 'active'),
('Başkent', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'Ankara', 4, '%50', 430.20, 432.50, 435.00, 5500, 5400, 5300, 20, 167, 'active'),
('Çankaya', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'Ankara', 4, '%50', 425.30, 427.60, 430.10, 6200, 6100, 6000, 20, 168, 'active'),
('Atılım', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'Ankara', 4, '%50', 420.20, 422.50, 425.00, 7000, 6900, 6800, 15, 169, 'active'),
('İstanbul Arel', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%50', 415.30, 417.60, 420.10, 8000, 7900, 7800, 20, 170, 'active'),
('İstanbul Aydın', 'Fen-Edebiyat', 'İngilizce Mütercim-Tercümanlık (%50 Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%50', 410.20, 412.50, 415.00, 9000, 8900, 8800, 20, 171, 'active'),
('İstanbul Kültür', 'Fen-Edebiyat', 'İngilizce Mütercim-Tercümanlık (%50 Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%50', 422.30, 424.60, 427.10, 6500, 6400, 6300, 20, 172, 'active'),
('İstanbul Yeni Yüzyıl', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%50', 408.20, 410.50, 413.00, 9500, 9400, 9300, 20, 173, 'active'),
('Maltepe', 'Fen-Edebiyat', 'İngilizce Mütercim-Tercümanlık (%50 Burslu)', 'YKS', 'dil', 'İstanbul', 4, '%50', 418.30, 420.60, 423.10, 7500, 7400, 7300, 20, 174, 'active'),
('Okto Eylül', 'Fen-Edebiyat', 'İngiliz Dili ve Edebiyatı (%50 Burslu)', 'YKS', 'dil', 'İzmir', 4, '%50', 412.50, 414.80, 417.30, 8800, 8700, 8600, 15, 175, 'active'),

-- === Special: Dentistry, Pharmacy, Veterinary ===
('Hacettepe', 'Diş Hekimliği', 'Diş Hekimliği', 'YKS', 'sayisal', 'Ankara', 5, '', 503.20, 506.30, 509.10, 250, 240, 220, 50, 176, 'active'),
('İstanbul', 'Diş Hekimliği', 'Diş Hekimliği', 'YKS', 'sayisal', 'İstanbul', 5, '', 501.50, 504.60, 507.40, 270, 260, 240, 50, 177, 'active'),
('Ankara', 'Diş Hekimliği', 'Diş Hekimliği', 'YKS', 'sayisal', 'Ankara', 5, '', 498.30, 501.40, 504.20, 310, 300, 280, 50, 178, 'active'),
('Ege', 'Diş Hekimliği', 'Diş Hekimliği', 'YKS', 'sayisal', 'İzmir', 5, '', 497.20, 500.30, 503.10, 330, 320, 300, 45, 179, 'active'),
('Selçuk', 'Diş Hekimliği', 'Diş Hekimliği', 'YKS', 'sayisal', 'Konya', 5, '', 493.50, 496.60, 499.40, 400, 390, 370, 45, 180, 'active'),
('Hacettepe', 'Eczacılık', 'Eczacılık', 'YKS', 'sayisal', 'Ankara', 5, '', 492.30, 495.40, 498.20, 420, 410, 390, 40, 181, 'active'),
('İstanbul', 'Eczacılık', 'Eczacılık', 'YKS', 'sayisal', 'İstanbul', 5, '', 490.50, 493.60, 496.40, 460, 450, 430, 40, 182, 'active'),
('Ankara', 'Eczacılık', 'Eczacılık', 'YKS', 'sayisal', 'Ankara', 5, '', 488.20, 491.30, 494.10, 500, 490, 470, 40, 183, 'active'),
('Ege', 'Eczacılık', 'Eczacılık', 'YKS', 'sayisal', 'İzmir', 5, '', 487.30, 490.40, 493.20, 520, 510, 490, 35, 184, 'active'),
('Gazi', 'Eczacılık', 'Eczacılık', 'YKS', 'sayisal', 'Ankara', 5, '', 485.50, 488.60, 491.40, 560, 550, 530, 40, 185, 'active'),
('Ankara', 'Veteriner', 'Veteriner Fakültesi', 'YKS', 'sayisal', 'Ankara', 5, '', 478.20, 481.30, 484.10, 700, 690, 670, 40, 186, 'active'),
('İstanbul', 'Veteriner', 'Veteriner Fakültesi', 'YKS', 'sayisal', 'İstanbul', 5, '', 476.50, 479.60, 482.40, 750, 740, 720, 30, 187, 'active'),
('Ege', 'Veteriner', 'Veteriner Fakültesi', 'YKS', 'sayisal', 'İzmir', 5, '', 473.30, 476.40, 479.20, 820, 810, 790, 35, 188, 'active'),
('Selçuk', 'Veteriner', 'Veteriner Fakültesi', 'YKS', 'sayisal', 'Konya', 5, '', 468.20, 471.30, 474.10, 950, 940, 920, 40, 189, 'active'),
('Ondokuz Mayıs', 'Veteriner', 'Veteriner Fakültesi', 'YKS', 'sayisal', 'Samsun', 5, '', 465.30, 468.40, 471.20, 1050, 1040, 1020, 40, 190, 'active'),

-- === Architecture ===
('İTÜ', 'Mimarlık', 'Mimarlık', 'YKS', 'sayisal', 'İstanbul', 4, '', 478.50, 480.80, 483.30, 1700, 1650, 1600, 50, 191, 'active'),
('ODTÜ', 'Mimarlık', 'Mimarlık', 'YKS', 'sayisal', 'Ankara', 4, '', 472.30, 474.60, 477.10, 2100, 2050, 2000, 45, 192, 'active'),
('Yıldız Teknik', 'Mimarlık', 'Mimarlık', 'YKS', 'sayisal', 'İstanbul', 4, '', 465.20, 467.50, 470.00, 2700, 2650, 2600, 60, 193, 'active'),
('Mimar Sinan', 'Mimarlık', 'Mimarlık', 'YKS', 'sayisal', 'İstanbul', 4, '', 470.50, 472.80, 475.30, 2300, 2250, 2200, 40, 194, 'active'),
('Selçuk', 'Mimarlık', 'Mimarlık', 'YKS', 'sayisal', 'Konya', 4, '', 448.30, 450.60, 453.10, 4800, 4700, 4600, 40, 195, 'active'),

-- === Nursing ===
('Hacettepe', 'Hemşirelik', 'Hemşirelik', 'YKS', 'sayisal', 'Ankara', 4, '', 475.20, 477.50, 480.00, 1900, 1850, 1800, 50, 196, 'active'),
('İstanbul', 'Hemşirelik', 'Hemşirelik', 'YKS', 'sayisal', 'İstanbul', 4, '', 472.30, 474.60, 477.10, 2100, 2050, 2000, 60, 197, 'active'),
('Ankara', 'Hemşirelik', 'Hemşirelik', 'YKS', 'sayisal', 'Ankara', 4, '', 468.50, 470.80, 473.30, 2500, 2450, 2400, 50, 198, 'active'),
('Ege', 'Hemşirelik', 'Hemşirelik', 'YKS', 'sayisal', 'İzmir', 4, '', 465.30, 467.60, 470.10, 2800, 2750, 2700, 50, 199, 'active'),
('Kocaeli', 'Sağlık', 'Hemşirelik', 'YKS', 'sayisal', 'Kocaeli', 4, '', 450.20, 452.50, 455.00, 4200, 4100, 4000, 50, 200, 'active');