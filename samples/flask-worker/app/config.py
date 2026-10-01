import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'flask-worker-secret')
    CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
