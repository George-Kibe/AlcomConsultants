# syntax=docker/dockerfile:1.7

ARG PYTHON_VERSION=3.14
ARG UV_VERSION=0.12

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

# ---------------------------------------------------------------- base
FROM python:${PYTHON_VERSION}-slim-trixie AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# GeoDjango runtime libraries (GDAL, GEOS, PROJ) + curl for health checks
RUN apt-get update \
    && apt-get install -y --no-install-recommends gdal-bin curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app

# ---------------------------------------------------------------- dependencies
FROM base AS deps
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv
ARG UV_SYNC_ARGS="--no-dev"
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-install-project ${UV_SYNC_ARGS}

# ---------------------------------------------------------------- development
FROM base AS dev
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv UV_PYTHON_DOWNLOADS=never
COPY --from=deps /opt/venv /opt/venv
USER app
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---------------------------------------------------------------- production
FROM base AS prod
COPY --from=deps /opt/venv /opt/venv
COPY --chown=app:app . .
RUN DJANGO_SETTINGS_MODULE=config.settings.prod \
    DJANGO_SECRET_KEY=build-only \
    DATABASE_URL=postgis://build:build@localhost/build \
    python manage.py collectstatic --noinput
# Mount point for the volume the edge Nginx serves /static/ from (must be writable by app).
RUN mkdir -p /app/staticfiles-shared && chown app:app /app/staticfiles-shared
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} DJANGO_SETTINGS_MODULE=config.settings.prod
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health/ || exit 1
CMD ["gunicorn", "config.wsgi:application", "-c", "gunicorn.conf.py"]
