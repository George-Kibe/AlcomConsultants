import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "postgis://alcom:alcom@localhost:5432/alcom")

from .base import *  # noqa: F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # fast tests
MAILERS = {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
