# Netor — Türkiye Sınav Hazırlık Platformu (PRD)

## Original Problem
Ölçeklenebilir bir sınav hazırlık SaaS platformu: online deneme sınavları, soru bankası, sonuç/gelişim takibi, otomatik eksik konu tespiti, ders notu yönlendirmesi ve (ileride) AI destekli kişisel çalışma önerileri. Sınav→Ders→Konu→Alt Konu→Soru hiyerarşisi; sınavlar admin panelinden yönetilir.

## Key Decisions (user-approved)
- Scope round 1: Çalışan MVP (auth + hiyerarşi + soru + deneme + dashboard).
- Database: **MongoDB** (kullanıcı onayı — platform MySQL desteklemiyor). İlişkisel hiyerarşi referanslarla korundu.
- Auth: JWT email+şifre (bcrypt). Token localStorage `netor_token`, Bearer header.
- AI: şimdilik kural tabanlı AI Koç; LLM entegrasyonu ertelendi.
- Design: çok-tonlu (ders bazlı renk) motive edici tema; Outfit/Figtree/Playfair fontları; framer-motion + lenis award-worthy landing.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`, `auth.py`, `seed.py`), Motor/MongoDB, tüm rotalar `/api`.
- Frontend: React + Tailwind + framer-motion + recharts + lenis. Routes in `App.js`, app shell `AppLayout.jsx` (desktop sidebar + mobil bottom nav).
- Collections: users, exams, subjects, topics, questions, tests, test_sessions, user_answers, user_test_results, login_attempts, password_reset_tokens.

## Implemented (2026-06)
- JWT auth: register/login/logout/me/forgot/reset, brute-force lockout (email-keyed), admin seeding.
- Exam hierarchy (10 sınav seed) + subjects/topics/questions; admin CRUD (exam/subject/topic/question/bulk).
- Question bank: pagination + filters (sınav/ders/zorluk/doğru-yanlış-boş), anında geri bildirim + açıklama.
- Deneme motoru: start session, timer countdown, işaretleme, soru listesi, otomatik kaydetme (localStorage), submit → net/puan hesaplama, sonuç sayfası.
- Dashboard: bugünkü hedef, başarı oranları, 7 gün grafiği, zayıf/güçlü konular, önerilen denemeler, XP/streak.
- Eksik konu tespiti: konu yeterlilik skoru (İyi/Geliştirilmeli/Kritik Eksik).
- Leaderboard: günlük/haftalık/aylık/tüm zamanlar + puan/doğru/XP + sınav filtresi.
- AI Koç (kural tabanlı), Profil (düzenleme + istatistik), Admin paneli (stats + sınav/soru ekleme).
- Award-worthy landing (kinetik hero, marquee, manifesto chapters, parallax).
- Testing: 54/54 backend pytest pass; tüm frontend akışları çalışıyor.

## Test Credentials
- Admin: admin@sinav.com / admin123
- Demo (geçmişli): demo@sinav.com / demo123

## Backlog
- P1: LLM destekli AI Koç + kişisel çalışma planı; ders notları modülü (PDF/video) + eksik konu→ders notu yönlendirme; CSV/Excel toplu soru import; puan hesaplama motoru (sınav bazlı katsayı/net kuralları).
- P2: Gamification (rozetler, seviyeler), bildirimler, dark mode, alt konu (subtopic) derinliği, MongoDB aggregation pipeline optimizasyonu, admin question ref-validation, session cleanup.

## Next Tasks
- Ders notları + otomatik yönlendirme, AI entegrasyonu, toplu import, sınav bazlı puanlama.
