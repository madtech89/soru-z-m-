import os
import uuid

import pytest
import requests
from pathlib import Path

ROOT_DIR = Path(__file__).parents[2]
frontend_env = dotenv_values(ROOT_DIR / "frontend" / ".env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL") or "http://127.0.0.1:8000"
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

DEMO = {"email": "demo@sinav.com", "password": "demo123"}
ADMIN = {"email": "admin@sinav.com", "password": "admin123"}


@pytest.fixture(scope="session")
def api():
    return API


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {creds['email']}: {r.status_code} {r.text[:300]}")
    token = r.json().get("token")
    if not token:
        pytest.fail("Login response missing token")
    return token


@pytest.fixture(scope="session")
def demo_token():
    return _login(DEMO)


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def user_client(demo_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {demo_token}"})
    return s


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {admin_token}"})
    return s


@pytest.fixture
def random_email():
    return f"test_{uuid.uuid4().hex[:10]}@qatest-example.com"
