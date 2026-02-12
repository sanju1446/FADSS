import json
import os
from datetime import datetime, timezone

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BROADCAST_FILE = os.path.join(os.path.dirname(__file__), "broadcast.json")

celery_app = Celery(
    "fadss_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
)


def _write_broadcast(payload: dict):
    os.makedirs(os.path.dirname(BROADCAST_FILE), exist_ok=True)
    with open(BROADCAST_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


@celery_app.task
def save_broadcast(message: str) -> dict:
    """Persist the latest broadcast message to disk."""
    payload = {
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _write_broadcast(payload)
    return payload


def read_latest_broadcast() -> dict:
    if not os.path.exists(BROADCAST_FILE):
        return {}
    try:
        with open(BROADCAST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

