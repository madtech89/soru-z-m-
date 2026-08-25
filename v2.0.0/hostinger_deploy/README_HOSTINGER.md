# 🚀 HedefMatik.com — Hostinger Canlıya Alma (Deployment) Rehberi

Bu rehber, **hedefmatik.com** projesini Hostinger sunucunuza (Web Hosting hPanel veya VPS) en kolay ve sorunsuz şekilde kurup canlıya almanız için hazırlanmıştır.

---

## 📦 Sunucuya Yüklenecek Dosyalar Nelerdir?

Proje iki ana parçadan oluşur:
1. **Frontend (React Derlemesi)**: `dist/` klasörü içindeki tüm dosyalar (`index.html`, `assets/`, `.htaccess`, `robots.txt`, `sitemap.xml`).
2. **Backend (Python FastAPI & MySQL API)**: `backend/` klasörü (`server.py`, `models.py`, `database.py`, `ai.py`, `requirements.txt`, `.env`).

---

## YÖNTEM 1: Hostinger VPS / Cloud Sunucu (Önerilen & En Performanslı)

### 1. Dosyaları Sunucuya Çekin
Sunucunuza SSH ile bağlanıp `/var/www/hedefmatik` klasörüne projeyi klonlayın veya zip olarak yükleyin:
```bash
mkdir -p /var/www/hedefmatik
cd /var/www/hedefmatik
git clone https://github.com/madtech89/soru-z-m-.git .
git checkout v2.0.0
```

### 2. Frontend'i Derleyin (veya lokalde derlenen `dist` klasörünü yükleyin)
```bash
npm install
npm run build
```

### 3. Backend Sanal Ortamını (Venv) Kurun
```bash
cd /var/www/hedefmatik/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. `.env` Yapılandırmasını Oluşturun
`hostinger_deploy/.env.production.example` dosyasını `backend/.env` olarak kopyalayın ve kendi MySQL bilgilerinizi ile AI API Key'lerinizi girin:
```bash
cp /var/www/hedefmatik/hostinger_deploy/.env.production.example /var/www/hedefmatik/backend/.env
nano /var/www/hedefmatik/backend/.env
```

### 5. Veritabanını Doldurun (Seed)
```bash
python seed_master_osym_curriculum.py
python seed_turkish_universities.py
```

### 6. Backend Servisini Başlatın (Systemd Daemon)
```bash
sudo cp /var/www/hedefmatik/hostinger_deploy/hedefmatik-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hedefmatik-backend
sudo systemctl start hedefmatik-backend
sudo systemctl status hedefmatik-backend
```

### 7. Nginx ve SSL Sertifikasını Kurun
```bash
sudo cp /var/www/hedefmatik/hostinger_deploy/nginx-hedefmatik.conf /etc/nginx/sites-available/hedefmatik.conf
sudo ln -s /etc/nginx/sites-available/hedefmatik.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Ücretsiz SSL Kurulumu:
sudo certbot --nginx -d hedefmatik.com -d www.hedefmatik.com
```

---

## YÖNTEM 2: Hostinger Paylaşımlı Hosting (hPanel / cPanel)

### Adım 1: Frontend Yükleme (`public_html`)
1. Hostinger **hPanel -> Dosya Yöneticisi** (File Manager)'ne gidin.
2. `public_html` klasörüne girin.
3. Projenizdeki **`dist/` klasörü içerisindeki tüm dosyaları** (`index.html`, `assets/`, `.htaccess`, `robots.txt`, `sitemap.xml`) doğrudan `public_html` içine yükleyin.
4. `.htaccess` dosyasının yüklendiğinden emin olun (React Router SPA yönlendirmelerini yönetir).

### Adım 2: Veritabanı Açma (MySQL)
1. Hostinger **hPanel -> Veritabanları -> MySQL Veritabanları** bölümüne gidin.
2. Yeni veritabanı oluşturun (örn: `u123456_hedefmatik_db`) ve kullanıcı + şifre belirleyin.

### Adım 3: Python Backend Başlatma (Hostinger Python App / Subdomain)
1. Hostinger hPanel'de **Python App** veya **Node.js/Python Manager** bölümünden yeni uygulama oluşturun:
   - **Application Root**: `backend`
   - **Startup File**: `server.py`
   - **Entry Point / Application**: `app`
2. `backend/.env` içine oluşturduğunuz veritabanı bilgilerini ve API anahtarlarınızı yazın.
3. Python bağımlılıklarını kurmak için `pip install -r requirements.txt` komutunu çalıştırın.

---

## 🎯 Başarı Kontrolü
- Tarayıcınızdan **https://hedefmatik.com** adresine girdiğinizde HedefMatik ana sayfası açılmalıdır.
- Sınavlar, Puan Hesaplama ve Tercih Robotu sayfaları sorunsuz çalışmalıdır.
- Yönetici paneline **admin@sinav.com** veya **admin@hedefmatik.com** ve şifrenizle giriş yapabilirsiniz.
