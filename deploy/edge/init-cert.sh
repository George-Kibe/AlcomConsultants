#!/usr/bin/env bash
# Obtain the first Let's Encrypt certificate (run once, before starting the edge Nginx).
# Uses certbot's standalone server on port 80, so Nginx must not be running yet.
set -euo pipefail
cd "$(dirname "$0")"
set -a
# shellcheck source=/dev/null
source .env
set +a
: "${DOMAIN:?}" "${LETSENCRYPT_EMAIL:?}"

# Pass --staging for a trial run against Let's Encrypt's test CA (avoids rate limits).
docker compose run --rm -p 80:80 certbot certonly --standalone \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email "$@"
