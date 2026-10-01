#!/usr/bin/env bash
# First-time (and repeatable) setup of the mail server on the VPS. Run as root from
# /opt/alcom/deploy/mail after the DNS records in docs/MAIL.md resolve:
#   ./setup.sh
# Idempotent: re-running keeps existing mailboxes, passwords and keys.
set -euo pipefail
cd "$(dirname "$0")"
DOMAIN=alcomconsultants.co.ke
HOST="mail.$DOMAIN"
APP_ENV=../../.env
CREDENTIALS=/root/mail-credentials.txt

[ "$(dig +short A "$HOST" | tail -1)" = "$(curl -4 -s https://ifconfig.me)" ] \
  || { echo "DNS: $HOST does not point to this server yet." >&2; exit 1; }

# 1. Configuration with fresh secrets (kept if it already exists).
if [ ! -f mailu.env ]; then
  cp mailu.env.example mailu.env
  sed -i "s/^SECRET_KEY=.*/SECRET_KEY=$(openssl rand -hex 16)/; s/^API_TOKEN=.*/API_TOKEN=$(openssl rand -hex 32)/" mailu.env
  chmod 600 mailu.env
fi

# 2. DKIM key (normally created earlier so its DNS record could be published first).
docker run --rm -v mail_dkim:/dkim alpine:3.22 sh -c "
  apk add -q openssl >/dev/null; f=/dkim/$DOMAIN.dkim.key
  [ -f \$f ] || openssl genrsa -out \$f 2048 2>/dev/null; chmod 644 \$f"

# 3. TLS certificate for mail.<domain> from the edge's certbot (webroot via the edge Nginx).
(cd ../edge && set -a && . ./.env && set +a &&
  docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d "$HOST" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --keep-until-expiring --non-interactive)

# 4. Firewall: incoming mail (25), sending (465), IMAP (993).
for port in 25 465 993; do ufw allow "$port/tcp" >/dev/null; done

# 5. Start (or update) the stack and wait for the admin service's first-start migration.
docker compose pull --quiet
docker compose up -d --remove-orphans
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q admin)")" = healthy ]; do sleep 5; done

# 6. Domain and mailboxes. New passwords go to a root-only file (never printed); the
#    website's noreply@ password goes straight into the app's .env.
docker compose exec -T admin flask mailu domain "$DOMAIN" >/dev/null 2>&1 || true
touch "$CREDENTIALS" && chmod 600 "$CREDENTIALS"
for user in info noreply admin; do
  password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  # admin@ is the global administrator (Mailu admin UI); the others are ordinary mailboxes.
  if [ "$user" = admin ]; then create=(admin "$user" "$DOMAIN" "$password" --mode create)
  else create=(user "$user" "$DOMAIN" "$password"); fi
  if docker compose exec -T admin flask mailu "${create[@]}" >/dev/null 2>&1; then
    echo "$user@$DOMAIN $password" >> "$CREDENTIALS"
    echo "Created $user@$DOMAIN"
    if [ "$user" = noreply ]; then
      sed -i '/^EMAIL_HOST=/d; /^EMAIL_PORT=/d; /^EMAIL_USE_TLS=/d; /^EMAIL_USE_SSL=/d; /^EMAIL_HOST_USER=/d; /^EMAIL_HOST_PASSWORD=/d' "$APP_ENV"
      printf 'EMAIL_HOST=%s\nEMAIL_PORT=465\nEMAIL_USE_TLS=false\nEMAIL_USE_SSL=true\nEMAIL_HOST_USER=noreply@%s\nEMAIL_HOST_PASSWORD=%s\n' \
        "$HOST" "$DOMAIN" "$password" >> "$APP_ENV"
    fi
  else
    echo "Exists  $user@$DOMAIN"
  fi
done

echo
echo "Done. Webmail: https://$HOST  (passwords for new mailboxes: $CREDENTIALS)"
echo "The website picks up the noreply@ password on its next restart."
