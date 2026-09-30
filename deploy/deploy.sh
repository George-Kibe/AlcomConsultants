#!/usr/bin/env bash
# Build and (re)start the production app stack from the current git checkout.
# Usage (on the server, from the repo root):  ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env — copy deploy/.env.production.example first."; exit 1; }

if [ "${SKIP_PULL:-0}" != 1 ]; then
  echo "==> Updating code"
  git pull --ff-only
fi

APP_VERSION="$(git rev-parse --short HEAD)"
sed -i "s/^APP_VERSION=.*/APP_VERSION=${APP_VERSION}/" .env
echo "==> Deploying version ${APP_VERSION}"

COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)

docker network inspect edge >/dev/null 2>&1 || docker network create edge

echo "==> Building images"
"${COMPOSE[@]}" build

echo "==> Starting database and cache"
"${COMPOSE[@]}" up -d --wait db redis

echo "==> Applying database migrations"
"${COMPOSE[@]}" run --rm --no-deps backend python manage.py migrate --noinput

echo "==> Starting services"
"${COMPOSE[@]}" up -d --wait --remove-orphans

echo "==> Removing old images"
docker image prune -f >/dev/null

"${COMPOSE[@]}" ps
echo "==> Deployed ${APP_VERSION}"
