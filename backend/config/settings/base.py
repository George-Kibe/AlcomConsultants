"""Settings shared by every environment. Values come from environment variables."""

from pathlib import Path
from typing import Any

import environ
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()

# ------------------------------------------------------------------ core
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS: list[str] = env.list("DJANGO_ALLOWED_HOSTS", default=[])
CSRF_TRUSTED_ORIGINS: list[str] = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

SITE_URL = env("SITE_URL", default="http://localhost:8080")
ADMIN_URL = env("DJANGO_ADMIN_URL", default="django-admin/")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.mfa",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.headless",
]
LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.locations",
    "apps.listings",
    "apps.projects",
    "apps.blog",
    "apps.saved",
    "apps.enquiries",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ------------------------------------------------------------------ data
DATABASES = {
    "default": env.db_url("DATABASE_URL", engine="django.contrib.gis.db.backends.postgis"),
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DATABASE_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "KEY_PREFIX": "alcom",
    }
}

# ------------------------------------------------------------------ auth
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",  # Django admin
    "allauth.account.auth_backends.AuthenticationBackend",  # dashboard / API (rate limited)
]

# django-allauth in headless mode: the Next.js app renders every screen and talks to
# /api/v1/auth/browser/v1/… using the session cookie + CSRF token.
ACCOUNT_ADAPTER = "apps.accounts.adapter.AccountAdapter"
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*"]
ACCOUNT_SIGNUP_FORM_CLASS = "apps.accounts.forms.SignupForm"  # + the reader's name
# Readers sign up to comment on the blog. Verification is "optional" so staff accounts made
# by an admin (no verified address on record) can still sign in; commenting requires a
# verified address (apps.accounts.serializers.can_comment), confirmed by an emailed link.
# (Verification by code would need "mandatory".)
ACCOUNT_EMAIL_VERIFICATION = "optional"
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_EMAIL_SUBJECT_PREFIX = "Alcom Consultants: "
ACCOUNT_LOGIN_BY_CODE_ENABLED = False
ACCOUNT_PASSWORD_RESET_BY_CODE_ENABLED = False
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ("browser",)
HEADLESS_FRONTEND_URLS = {
    "account_reset_password": f"{SITE_URL}/account/forgot-password",
    "account_reset_password_from_key": f"{SITE_URL}/account/reset-password/{{key}}",
    "account_signup": f"{SITE_URL}/account/sign-up",
    "account_confirm_email": f"{SITE_URL}/account/verify-email/{{key}}",
    "socialaccount_login_error": f"{SITE_URL}/account/sign-in?error=social",
    # Google returned an email that already has an account: sign in with the password.
    "socialaccount_signup": f"{SITE_URL}/account/sign-in?error=exists",
}
# Google sign-in for readers; enabled once the OAuth client is configured (docs/AUTH.md).
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
SOCIALACCOUNT_PROVIDERS: dict[str, dict[str, Any]] = {
    "google": {
        "APPS": (
            [{"client_id": GOOGLE_CLIENT_ID, "secret": env("GOOGLE_CLIENT_SECRET", default="")}]
            if GOOGLE_CLIENT_ID
            else []
        ),
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online", "prompt": "select_account"},
    }
}
SOCIALACCOUNT_STORE_TOKENS = False
MFA_SUPPORTED_TYPES = ["totp", "recovery_codes"]
MFA_TOTP_ISSUER = "Alcom Consultants"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # one week
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------ i18n
LANGUAGE_CODE = "en"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------ static
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ------------------------------------------------------------------ security (safe everywhere)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
# Nginx terminates TLS and forwards the original scheme.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# ------------------------------------------------------------------ DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "300/min",
        "comments_burst": "5/min",
        "comments_daily": "50/day",
        "account_delete": "10/hour",
        "enquiries_burst": "5/min",
        "enquiries_daily": "30/day",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Alcom Consultants API",
    "DESCRIPTION": "Property listings, enquiries and content API.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]+",
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "PropertyStatusEnum": "apps.listings.models.Status",
        "ProjectStatusEnum": "apps.projects.models.ProjectStatus",
        "PostStatusEnum": "apps.blog.models.PostStatus",
        "EnquiryKindEnum": "apps.enquiries.models.Kind",
        "EnquiryStageEnum": "apps.enquiries.models.Stage",
    },
}

# ------------------------------------------------------------------ media (Cloudinary)
# cloudinary://<api_key>:<api_secret>@<cloud_name> — from the Cloudinary dashboard.
CLOUDINARY_URL = env("CLOUDINARY_URL", default="")
if CLOUDINARY_URL and not CLOUDINARY_URL.startswith("cloudinary://"):
    raise ImproperlyConfigured(
        "CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>. "
        "Check .env for quotes or a repeated 'CLOUDINARY_URL=' prefix."
    )
# Keeps each environment's uploads apart inside one Cloudinary account.
CLOUDINARY_FOLDER = env("CLOUDINARY_FOLDER", default="alcom/dev")

# ------------------------------------------------------------------ Celery
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = None
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_TIME_LIMIT = 5 * 60
CELERY_TASK_SOFT_TIME_LIMIT = 4 * 60
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BEAT_SCHEDULE = {
    # Saved-search digest, every morning (Nairobi time).
    "saved-search-alerts": {
        "task": "apps.saved.tasks.send_saved_search_alerts",
        "schedule": crontab(hour=7, minute=0),
    },
    # Leads due for a follow-up, to each assignee (Nairobi time).
    "enquiry-follow-ups": {
        "task": "apps.enquiries.tasks.send_follow_up_reminders",
        "schedule": crontab(hour=7, minute=30),
    },
}

# ------------------------------------------------------------------ email
# Development: Gmail SMTP (app password, port 587 + STARTTLS).
# Production: our Mailu server, mail.alcomconsultants.co.ke:465 with implicit TLS (EMAIL_USE_SSL).
MAILERS: dict[str, dict[str, Any]] = {
    "default": {
        "BACKEND": "django.core.mail.backends.smtp.EmailBackend",
        "OPTIONS": {
            "host": env("EMAIL_HOST", default="smtp.gmail.com"),
            "port": env.int("EMAIL_PORT", default=587),
            "username": env("EMAIL_HOST_USER", default=""),
            "password": env("EMAIL_HOST_PASSWORD", default=""),
            "use_tls": env.bool("EMAIL_USE_TLS", default=True),
            "use_ssl": env.bool("EMAIL_USE_SSL", default=False),
            "timeout": 20,
        },
    },
}
DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL", default="Alcom Consultants <noreply@alcomconsultants.co.ke>"
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL
# New website enquiries are emailed here (comma-separated); the first also receives replies
# to the confirmation sent to the visitor.
ENQUIRY_NOTIFY_EMAILS = env.list("ENQUIRY_NOTIFY_EMAILS", default=["info@alcomconsultants.co.ke"])
COMPANY_PHONE = "+254 792 616 015"
COMPANY_WHATSAPP = "254792616015"

# ------------------------------------------------------------------ spam protection
# Cloudflare Turnstile on enquiry forms (docs/ENQUIRIES.md). Without keys the forms rely on
# the honeypot, the minimum fill time and rate limits.
TURNSTILE_SITE_KEY = env("TURNSTILE_SITE_KEY", default="")
TURNSTILE_SECRET_KEY = env("TURNSTILE_SECRET_KEY", default="")

# ------------------------------------------------------------------ logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "verbose"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django.db.backends": {"level": "WARNING"},
    },
}
