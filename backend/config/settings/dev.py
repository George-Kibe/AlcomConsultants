from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # browsable API in development only
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []

# Until Gmail SMTP credentials are set in .env, print emails to the backend logs instead.
if not MAILERS["default"]["OPTIONS"]["username"]:
    MAILERS["default"] = {"BACKEND": "django.core.mail.backends.console.EmailBackend"}
