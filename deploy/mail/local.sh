#!/usr/bin/env bash
# Local trial of the mail stack: ./local.sh up | test | down
set -euo pipefail
cd "$(dirname "$0")"
export COMPOSE_PROJECT_NAME=mail-local CERTS_VOLUME=mail-local-certs DKIM_VOLUME=mail-local_dkim
compose() { docker compose -p mail-local -f compose.yaml -f compose.local.yaml --env-file /dev/null "$@"; }
HOST=mail.alcomconsultants.co.ke
PASSWORD=Local-test-pass-2026

case "${1:-}" in
  up)
    [ -f mailu.env ] || {
      cp mailu.env.example mailu.env
      sed -i "s/^SECRET_KEY=.*/SECRET_KEY=$(openssl rand -hex 16)/; s/^API_TOKEN=.*/API_TOKEN=$(openssl rand -hex 32)/; s|^REAL_IP_FROM=.*|REAL_IP_FROM=127.0.0.1/32|" mailu.env
    }
    docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
    docker volume create mail-local-certs >/dev/null
    # Self-signed certificate at the same path the edge's Let's Encrypt one uses.
    docker run --rm -v mail-local-certs:/certs alpine:3.22 sh -c "
      apk add -q openssl >/dev/null; d=/certs/live/$HOST; mkdir -p \$d
      [ -f \$d/fullchain.pem ] || openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
        -subj /CN=$HOST -keyout \$d/privkey.pem -out \$d/fullchain.pem 2>/dev/null"
    # DKIM key (on the server it is created the same way, see docs/MAIL.md).
    docker run --rm -v mail-local_dkim:/dkim alpine:3.22 sh -c "
      apk add -q openssl >/dev/null; f=/dkim/alcomconsultants.co.ke.dkim.key
      [ -f \$f ] || openssl genrsa -out \$f 2048 2>/dev/null; chmod 644 \$f"
    compose up -d
    # Wait for admin's first-start database migration before using its CLI.
    echo "Waiting for the admin service…"
    until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q admin)")" = healthy ]; do sleep 5; done
    compose exec -T admin flask mailu domain alcomconsultants.co.ke
    for user in info noreply; do
      compose exec -T admin flask mailu user "$user" alcomconsultants.co.ke "$PASSWORD" 2>/dev/null \
        || compose exec -T admin flask mailu password "$user" alcomconsultants.co.ke "$PASSWORD"
    done
    compose exec -T admin flask mailu admin admin alcomconsultants.co.ke "$PASSWORD" --mode update
    echo "Ready: webmail http://localhost:8025/webmail (info@alcomconsultants.co.ke / $PASSWORD)"
    ;;
  test)
    MAIL_TEST_HOST=127.0.0.1 MAIL_TEST_PASSWORD="$PASSWORD" MAIL_TEST_INSECURE=1 \
      MAIL_TEST_PORTS=2525,4465,9993 python3 test_mail.py
    ;;
  down)
    compose down "${@:2}"
    ;;
  *) echo "usage: $0 up | test | down [-v]" >&2; exit 2 ;;
esac
