#!/usr/bin/env bash
# ============================================================
# HedefMatik (hedefmatik.com) - Otomatik Canlı Sunucu Güncelleyici
# ============================================================
set -e

SSH_HOST="72.62.153.26"
SSH_PORT="65002"
SSH_USER="u341740237"
SSH_KEY="$HOME/.ssh/id_ed25519_hedefmatik"
REMOTE_TARGET="/home/u341740237/domains/hedefmatik.com/public_html"
BACKEND_TARGET="/home/u341740237/hedefmatik_backend"

echo "====================================================="
echo "🚀 HedefMatik Canlı Dağıtım (Deploy to Live) Başlatılıyor..."
echo "🌐 Domain: https://hedefmatik.com"
echo "🖥️ Sunucu: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
echo "🔑 SSH Anahtarı: ${SSH_KEY}"
echo "====================================================="

# 1. Frontend Build
echo "📦 1/3 Frontend derleniyor (Vite build)..."
npm run build

# 2. Frontend Dosyalarını Hostinger public_html dizinine aktar
echo "📤 2/3 Frontend dosyaları Hostinger public_html dizinine yükleniyor..."
rsync -avz -e "ssh -i ${SSH_KEY} -p ${SSH_PORT} -o StrictHostKeyChecking=no" ./dist/ "${SSH_USER}@${SSH_HOST}:${REMOTE_TARGET}/" || \
scp -i "${SSH_KEY}" -P ${SSH_PORT} -o StrictHostKeyChecking=no -r ./dist/* "${SSH_USER}@${SSH_HOST}:${REMOTE_TARGET}/"

# 3. Backend Dosyalarını Senkronize Et
echo "⚙️ 3/3 Backend dosyaları senkronize ediliyor..."
rsync -avz --exclude '.env*' --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' --exclude 'uploads' -e "ssh -i ${SSH_KEY} -p ${SSH_PORT} -o StrictHostKeyChecking=no" ./backend/ "${SSH_USER}@${SSH_HOST}:${BACKEND_TARGET}/" || true

echo "====================================================="
echo "✅ HedefMatik.com başarıyla canlıya güncellendi!"
echo "====================================================="
