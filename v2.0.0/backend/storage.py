import os
from pathlib import Path

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", Path(__file__).parent / "uploads"))
APP_NAME = "hedefmatik"

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "csv": "text/csv",
    "txt": "text/plain",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def init_storage(force: bool = False):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return str(UPLOAD_DIR)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    init_storage()
    file_path = UPLOAD_DIR / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return {
        "path": path,
        "size": len(data),
        "content_type": content_type,
    }


def get_object(path: str):
    file_path = UPLOAD_DIR / path
    if not file_path.exists():
        raise FileNotFoundError(f"Dosya bulunamadı: {path}")
    ext = (path.rsplit(".", 1)[-1] if "." in path else "").lower()
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    return file_path.read_bytes(), content_type
