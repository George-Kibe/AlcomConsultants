"""Gunicorn settings for production. Tunable via environment variables."""

import multiprocessing
import os

bind = "0.0.0.0:8000"
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
worker_class = "gthread"
timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
worker_tmp_dir = "/dev/shm"  # noqa: S108  (recommended for Gunicorn in containers)
forwarded_allow_ips = "*"  # only reachable from Nginx on the internal Docker network
accesslog = "-"
errorlog = "-"
