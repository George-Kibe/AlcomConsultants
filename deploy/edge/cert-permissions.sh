#!/usr/bin/env bash
# Let the edge Nginx's worker processes (group nginx, gid 101) read the certificates.
# The webmail vhost loads mail.<domain>'s certificate per TLS handshake (so the edge can
# start before that certificate exists); that read happens in a worker, not the root
# master, and certbot keeps live/ and archive/ root-only. Idempotent; run after certbot.
set -euo pipefail
cd "$(dirname "$0")"
docker compose run --rm --entrypoint sh certbot -c '
  cd /etc/letsencrypt
  chgrp -R 101 live archive
  chmod 750 live archive
  find live archive -mindepth 1 -type d -exec chmod 750 {} +
  find archive -name "privkey*.pem" -exec chmod 640 {} +'
