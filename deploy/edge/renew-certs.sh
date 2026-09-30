#!/usr/bin/env bash
# Renew certificates due within 30 days (webroot via the running Nginx) and reload Nginx.
# Cron runs this twice a day; `./renew-certs.sh --dry-run` tests the whole flow.
set -euo pipefail
cd "$(dirname "$0")"
docker compose run --rm certbot renew --webroot -w /var/www/certbot --quiet "$@"
docker compose exec -T nginx nginx -s reload
