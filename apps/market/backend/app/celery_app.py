from celery import Celery
import os
redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
celery = Celery('app', broker=redis_url, backend=redis_url)
celery.conf.task_routes = {'app.tasks.*': {'queue': 'default'}}
celery.conf.beat_schedule = {
    # periodic tasks can be added here
}
