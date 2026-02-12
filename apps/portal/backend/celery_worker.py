from celery import Celery
import os

# Configure Celery to use Redis as the broker and backend
# Ensure you have a Redis server running on localhost:6379
celery_app = Celery(
    "fadss_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def example_task(word: str):
    return f"Hello {word}, this is a background task!"
