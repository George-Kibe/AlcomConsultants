#!/usr/bin/env bash
# Renew certificates due within 30 days (webroot via the running Nginx) and reload Nginx.
# Cron runs this twice a day; `./renew-certs.sh --dry-run` tests the whole flow.
set -euo pipefail
cd "$(dirname "$0")"
docker compose run --rm certbot renew --webroot -w /var/www/certbot --quiet "$@"
./cert-permissions.sh # renewed files must stay readable by Nginx's workers
docker compose exec -T nginx nginx -s reload
# The mail server (deploy/mail) reads mail.<domain>'s certificate from the same volume.
if [ -n "$(docker ps -q -f name='^mail-front-1$')" ]; then
  docker exec mail-front-1 sh -c 'nginx -s reload && doveadm reload' >/dev/null
fi
