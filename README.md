# 🎓 Netor — Akıllı Sınav Hazırlık Platformu

<div align="center">

![Version](https://img.shields.io/badge/version-v1.0.0-blue.svg?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MySQL](https://img.shields.io/badge/MySQL_9-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**YKS, KPSS, TYT, AYT, TUS, DUS, ALES, DGS ve YDS için yeni nesil, yapay zekâ destekli ve kapsamlı sınav hazırlık platformu.**

</div>

---

## 🌟 Öne Çıkan Özellikler

- **📝 Online Deneme Sınavları & Soru Bankası**: 
  - Gerçek sınav süresi geri sayımı, soru işaretleme, otomatik oturum kurtarma ve anlık net/puan hesaplama.
  - Sınav, ders, konu ve zorluk seviyesine göre filtrelenebilir soru bankası.
- **🤖 Yapay Zekâ Çalışma Koçu (Google Gemini & OpenAI)**:
  - Öğrencinin gerçek test sonuçlarına, zayıf/güçlü konu analizlerine ve hedeflerine dayalı kişiselleştirilmiş 7 günlük çalışma planı ve motivasyon analizi.
- **📊 Eksik Konu Analitiği & Yeterlilik Skoru**:
  - Konu bazında başarı oranları (Kritik Eksik, Geliştirilmeli, İyi) ve eksik konulara özel ders notu önerileri.
- **📚 Ders Notları & Video Konu Anlatımları**:
  - PDF/dosya görüntüleme, YouTube konu anlatım videoları ve zengin içerikli ders notları.
- **⚖️ Sınav Bazlı Puan Hesaplama Motoru**:
  - Sınavların resmi katsayılarına, standart sapmalarına ve yanlış cezalarına (4 yanlış 1 doğru) göre dinamik puan hesaplama.
- **🏆 Liderlik Tablosu & Gamification**:
  - Günlük/haftalık/aylık sıralamalar, kazanılan XP'ler ve çalışma serileri (streak).
- **🛡️ Güçlü Yönetici (Admin) Paneli**:
  - Sınav, ders, konu, soru ve ders notu CRUD yönetimi, CSV ile toplu soru yükleme ve sistem istatistikleri.

---

## 🛠️ Teknoloji Mimarisi

### **Backend (Arka Yüz)**
- **Framework**: FastAPI (Python 3.9+)
- **Veritabanı**: MySQL 9.7 (İlişkisel Veritabanı Mimarisi)
- **ORM**: SQLAlchemy 2.0 (Async) + `aiomysql` / `PyMySQL`
- **Kimlik Doğrulama**: JWT (JSON Web Tokens) & Bcrypt Şifreleme
- **Yapay Zekâ**: Google Gemini 1.5 Flash/Pro (`google-genai`) & OpenAI API desteği (Zeki yerel analitik motoruyla hata korumalı)
- **Depolama**: Bağımsız yerel dosya ve medya yönetimi (`uploads/`)

### **Frontend (Ön Yüz)**
- **Framework**: React 19 + React Router v7
- **Tasarım & UI**: TailwindCSS + Radix UI + Lucide Icons + Framer Motion (Akıcı animasyonlar)
- **Grafikler & Analitik**: Recharts
- **HTTP İstemcisi**: Axios + Token Interceptors

---

## 🚀 Hızlı Başlangıç & Kurulum

### 1. Gereksinimler
- **Node.js** (v18+) ve **npm**
- **Python** (v3.9+)
- **MySQL** (v8.0+ veya v9.0+)

### 2. Veritabanı ve Backend Kurulumu

```bash
# 1. Backend klasörüne gidin
cd backend

# 2. Python sanal ortamını oluşturun ve aktif edin
python3 -m venv venv
source venv/bin/activate   # Windows için: venv\Scripts\activate

# 3. Bağımlılıkları yükleyin
pip install -r requirements.txt

# 4. .env dosyanızı oluşturun / kontrol edin
# backend/.env:
# MYSQL_URL=mysql+aiomysql://root:@127.0.0.1:3306/netor_db?charset=utf8mb4
# GEMINI_API_KEY=your_gemini_api_key (Opsiyonel)

# 5. Backend sunucusunu başlatın (Port: 8001)
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Frontend Kurulumu

```bash
# 1. Frontend klasörüne gidin
cd frontend

# 2. Paketleri yükleyin
npm install --legacy-peer-deps

# 3. Geliştirici sunucusunu başlatın (Port: 3000)
npm start
```

Uygulama otomatik olarak **[http://localhost:3000](http://localhost:3000)** adresinde açılacaktır.

---

## 🔑 Varsayılan Giriş Bilgileri (Tohumlanmış Veriler)

| Rol | E-Posta | Şifre |
| :--- | :--- | :--- |
| **Yönetici (Admin)** | `admin@sinav.com` | `admin123` |
| **Öğrenci (Demo - Geçmiş Verili)** | `demo@sinav.com` | `demo123` |

---

## 📁 Proje Dizin Yapısı

```plaintext
├── backend/
│   ├── ai.py               # Google Gemini & AI Koç motoru
│   ├── auth.py             # JWT & Güvenlik katmanı
│   ├── database.py         # SQLAlchemy Async bağlantı ve Session
│   ├── models.py           # MySQL ilişkisel modeller (FK, İndeksler)
│   ├── requirements.txt    # Python paket listesi
│   ├── seed.py             # Otomatik veritabanı tohumlayıcı
│   ├── server.py           # FastAPI REST API rotaları
│   └── storage.py          # Yerel dosya depolama yöneticisi
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Dashboard, Denemeler, Soru Bankası, AI Koç vb. sayfalar
│   │   ├── components/     # Yeniden kullanılabilir UI bileşenleri
│   │   ├── context/        # AuthContext (Kullanıcı durumu)
│   │   ├── pages/          # Landing, Giriş ve Kayıt sayfaları
│   │   └── lib/            # Axios API istemcisi ve yardımcı fonksiyonlar
│   ├── package.json        # Frontend paketleri ve scriptler
│   └── tailwind.config.js  # Stil yapılandırması
│
└── README.md               # Proje dökümantasyonu
```

---

## 📜 Lisans & Geliştirme

Bu proje **Madtech** tarafından geliştirilmektedir. Tüm hakları saklıdır.
