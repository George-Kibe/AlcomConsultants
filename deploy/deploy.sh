#!/usr/bin/env bash
# Deploy the app stack on this server.
#
#   ./deploy/deploy.sh               update to the latest main and build images here
#   ./deploy/deploy.sh --pull <sha>  deploy <sha> using images CI already built and pushed
#                                    (this is what the GitHub "Deploy" workflow runs)
#
# If the new version fails its health checks, the previous version is restored
# (containers only; database migrations are not reversed) and the script exits non-zero.
#
# Stage 1 updates the checkout, then re-executes the *updated* script for stage 2, so changes
# to this file take effect in the same deploy. Everything is wrapped in functions so bash has
# parsed the whole file before git rewrites it on disk.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)

set_version() { sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env; }

# `compose up --wait` can report success while a container is crash-looping (the restart
# policy keeps it briefly "running"), so require every app service to settle as healthy.
verify_healthy() {
  local _ svc ok
  for _ in $(seq 1 30); do
    ok=1
    for svc in backend frontend worker; do
      [ "$("${COMPOSE[@]}" ps --format '{{.Health}}' "$svc" 2>/dev/null)" = healthy ] || ok=0
    done
    [ "$("${COMPOSE[@]}" ps --format '{{.State}}' beat 2>/dev/null)" = running ] || ok=0
    [ "$ok" = 1 ] && return 0
    sleep 3
  done
  return 1
}

stage1_update_code() {
  local mode="$1" ref="$2"
  [ -f .env ] || { echo "Missing .env — copy deploy/.env.production.example first."; exit 1; }

  export PREV_VERSION PREV_COMMIT
  PREV_VERSION="$(sed -n 's/^APP_VERSION=//p' .env)"
  PREV_COMMIT="$(git rev-parse HEAD)"

  # The server checkout mirrors main exactly (only the untracked .env files are local).
  if [ "${SKIP_PULL:-0}" != 1 ]; then
    echo "==> Fetching ${ref}"
    git fetch --quiet origin main
    git checkout --quiet main
    git reset --quiet --hard "$ref"
  fi

  DEPLOY_STAGE=2 exec ./deploy/deploy.sh "$mode"
}

stage2_deploy() {
  local mode="$1" registry
  local app_version
  app_version="$(git rev-parse --short=12 HEAD)"
  set_version "$app_version"
  echo "==> Deploying ${app_version} (${mode}), previous: ${PREV_VERSION:-none}"

  docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null

  if [ "$mode" = pull ]; then
    echo "==> Pulling images"
    "${COMPOSE[@]}" pull --quiet backend worker beat frontend
  else
    echo "==> Building images"
    "${COMPOSE[@]}" build
  fi

  echo "==> Starting database and cache"
  "${COMPOSE[@]}" up -d --wait db redis

  echo "==> Applying database migrations"
  "${COMPOSE[@]}" run --rm --no-deps backend python manage.py migrate --noinput

  echo "==> Starting services"
  if ! "${COMPOSE[@]}" up -d --wait --remove-orphans || ! verify_healthy; then
    echo "!!  New version ${app_version} failed its health checks." >&2
    "${COMPOSE[@]}" ps >&2 || true
    if [ -n "${PREV_VERSION:-}" ] && [ "$PREV_VERSION" != "$app_version" ]; then
      echo "!!  Rolling back to ${PREV_VERSION}" >&2
      git reset --quiet --hard "$PREV_COMMIT"
      set_version "$PREV_VERSION"
      if "${COMPOSE[@]}" up -d --wait --remove-orphans && verify_healthy; then
        echo "!!  Rolled back: ${PREV_VERSION} is live again." >&2
      else
        echo "!!  Rollback did not come up healthy either — check: docker compose ps / logs" >&2
      fi
    fi
    exit 1
  fi

  # The edge proxy renders its config at start-up, so recreate it when that config changed.
  if [ -f deploy/edge/.env ] && [ -n "${PREV_COMMIT:-}" ] &&
    ! git diff --quiet "$PREV_COMMIT" HEAD -- deploy/edge nginx/snippets; then
    echo "==> Edge proxy config changed: recreating Nginx"
    (cd deploy/edge && docker compose up -d --force-recreate nginx)
  fi

  echo "==> Removing old images (keeping ${app_version} and ${PREV_VERSION:-none} for rollback)"
  registry="$(sed -n 's/^IMAGE_REGISTRY=//p' .env)"
  registry="${registry:-ghcr.io/george-kibe}"
  docker images --format '{{.Repository}}:{{.Tag}}' |
    grep -E "^${registry}/alcom-" |
    grep -vE ":(${app_version}|${PREV_VERSION:-none})$" |
    xargs -r docker rmi >/dev/null 2>&1 || true
  docker image prune -f >/dev/null

  "${COMPOSE[@]}" ps
  echo "==> Deployed ${app_version}"
}

main() {
  if [ "${DEPLOY_STAGE:-1}" = 2 ]; then
    stage2_deploy "$1"
  elif [ "${1:-}" = "--pull" ]; then
    stage1_update_code pull "${2:?usage: deploy.sh --pull <commit-sha>}"
  else
    stage1_update_code build origin/main
  fi
}

main "$@"
exit
