import os
from dotenv import load_dotenv

# Load standard .env if present
load_dotenv()

# =========================================================================
# AI & Queue Worker Configuration
# =========================================================================

# Maksimum aynı anda (concurrent) işlenecek AI isteği sayısı. (Hostinger için 3 önerilir)
MAX_CONCURRENT_REQUESTS = int(os.environ.get("MAX_CONCURRENT_REQUESTS", 3))

# Hostinger Timeout kısıtlamaları (Saniye)
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", 120))
CONNECT_TIMEOUT = int(os.environ.get("CONNECT_TIMEOUT", 10))

# Yeniden deneme (Retry) ayarları
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", 3))

# 429 Rate Limit durumunda kademeli bekleme süreleri (Saniye)
COOLDOWN_429 = int(os.environ.get("COOLDOWN_429", 60))
COOLDOWN_429_SECOND = int(os.environ.get("COOLDOWN_429_SECOND", 120))
COOLDOWN_429_THIRD = int(os.environ.get("COOLDOWN_429_THIRD", 300))

# Queue Worker Polling aralığı (Saniye)
QUEUE_POLL_INTERVAL = int(os.environ.get("QUEUE_POLL_INTERVAL", 5))
