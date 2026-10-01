# Deployment

## Overview

```
Internet ──► edge Nginx (deploy/edge, ports 80/443, Let's Encrypt TLS)
                 │  Docker network "edge"
                 ├──► alcom-prod-frontend:3000   (Next.js)
                 ├──► alcom-prod-backend:8000    (/api/, admin path)
                 └──  /static/ served from the alcom-prod-static volume
             App stack (compose.yaml + compose.prod.yaml, project "alcom-prod"):
                 frontend · backend · worker · beat · db (PostGIS) · redis
```

- The **app stack** runs images tagged by commit. CI builds them and pushes them to GHCR, and `deploy/deploy.sh --pull` starts them. A manual `deploy.sh` builds on the server instead.
- The **edge stack** (`deploy/edge/`) is the only thing that publishes ports. It serves every app stack on the server, so staging can be added later without a second proxy.
- Certificates come from Let's Encrypt. The first one is obtained with `init-cert.sh`, and renewal runs twice daily from cron via `renew-certs.sh`.

| Environment | URL | How |
|---|---|---|
| Development | http://localhost:8080 | `make up` |
| Production | https://alcomconsultants.co.ke (`www` redirects to the apex) | this runbook |
| Staging | https://staging.alcomconsultants.co.ke | later: second app stack + server block |

## First deployment (runbook)

Run everything on the VPS. Commands assume Ubuntu/Debian and a user with `sudo`.

### 1. Prepare the server
```bash
lsb_release -ds; nproc; free -h; df -h /     # OS, CPUs, RAM, disk

sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ufw fail2ban unattended-upgrades
sudo timedatectl set-timezone Africa/Nairobi

# Firewall: SSH, HTTP, HTTPS only
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable && sudo ufw status
```
If the server has **less than 4 GB RAM**, add swap so image builds don't run out of memory:
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker   # use docker without sudo
docker --version && docker compose version
```

### 3. Point the domain at the server
At the domain registrar, create these records, replacing `SERVER_IP` with the server's IP address:

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

Delete any existing **AAAA** (IPv6) records for `@` or `www` that don't point to this server; Let's Encrypt checks IPv6 first. Wait until both names resolve to the server; this can take a few minutes. Don't request the certificate before then:
```bash
curl -4 -s ifconfig.me; echo                     # this server's IP
getent hosts alcomconsultants.co.ke www.alcomconsultants.co.ke
```

### 4. Get the code
```bash
sudo mkdir -p /opt/alcom && sudo chown $USER: /opt/alcom
git clone https://github.com/George-Kibe/AlcomConsultants.git /opt/alcom
cd /opt/alcom
```

### 5. Configure the app
```bash
cp deploy/.env.production.example .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n/+=')|" .env
sed -i "s|^DJANGO_ADMIN_URL=.*|DJANGO_ADMIN_URL=manage-$(openssl rand -hex 4)/|" .env
grep -E '^(SITE_URL|SITE_ENV|DJANGO_ADMIN_URL)=' .env   # note the admin path
nano .env                                                # review; optional email/Sentry
```
Photo uploads need Cloudinary. Add the "API environment variable" from the Cloudinary dashboard. Paste only the part from `cloudinary://` onwards after `CLOUDINARY_URL=`:
```bash
nano .env    # CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>   CLOUDINARY_FOLDER=alcom/prod
```
`SITE_ENV=staging` keeps search engines out, via `robots.txt`, while placeholder content is live. Change it to `production` at launch, then redeploy.

### 6. Build and start the app
```bash
./deploy/deploy.sh          # first build takes several minutes
docker compose -f compose.yaml -f compose.prod.yaml exec backend python manage.py createsuperuser
```
Staff then sign in at `https://alcomconsultants.co.ke/dashboard`. "Forgot password" emails only work once the domain mailbox's SMTP settings (`EMAIL_*`) are in `.env`.

### 7. Configure the edge proxy and get the certificate
```bash
cd /opt/alcom/deploy/edge
cp .env.example .env
ADMIN=$(grep '^DJANGO_ADMIN_URL=' ../../.env | cut -d= -f2)
sed -i "s|^ADMIN_PATH=.*|ADMIN_PATH=$ADMIN|" .env
sed -i "s|^LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=you@example.com|" .env   # your email
cat .env

./init-cert.sh              # Let's Encrypt certificate for the apex and www
docker compose up -d        # start Nginx with HTTPS
```

### 8. Automate certificate renewal
```bash
./renew-certs.sh --dry-run  # full renewal rehearsal against Let's Encrypt staging
( crontab -l 2>/dev/null; echo "17 3,15 * * * /opt/alcom/deploy/edge/renew-certs.sh >> /var/log/alcom-cert-renew.log 2>&1" ) | crontab -
sudo touch /var/log/alcom-cert-renew.log && sudo chown $USER: /var/log/alcom-cert-renew.log
crontab -l
```
Certificates last 90 days, and certbot renews them once they are within 30 days of expiry.

### 9. Verify
```bash
curl -sI http://alcomconsultants.co.ke | head -3         # 301 -> https
curl -sI https://www.alcomconsultants.co.ke | head -3    # 301 -> apex
curl -s https://alcomconsultants.co.ke/api/v1/health/    # {"status":"ok",...}
curl -s https://alcomconsultants.co.ke/robots.txt        # Disallow: / while SITE_ENV=staging
```
Then open https://alcomconsultants.co.ke in a browser, log in to the admin at `https://alcomconsultants.co.ke/<DJANGO_ADMIN_URL>`, and check the TLS grade at https://www.ssllabs.com/ssltest/.

## Automatic deployments (push to main)

```
git push origin main
   └─► CI workflow: lint, types, unit + e2e tests, then build images and push them to GHCR
          └─► (only if CI passed) Deploy workflow: SSH to the server →
                 ./deploy/deploy.sh --pull <commit>  →  pull images, migrate, restart
                 →  health gate (auto-rollback on failure)  →  check the live site over HTTPS
```

- Only commits that pass CI are deployed, and deploys run one at a time.
- The server runs the exact images CI tested; nothing is compiled on the VPS.
- If the new version isn't healthy, `deploy.sh` restores the previous one and the workflow fails. GitHub emails you about failed runs.
- Database migrations are **not** rolled back automatically, so keep them backwards-compatible.
- Re-deploy manually from GitHub: **Actions → Deploy → Run workflow**. On the server: `cd /opt/alcom && ./deploy/deploy.sh`, which builds locally.
- Don't edit tracked files on the server. Each deploy resets the checkout to the deployed commit; `.env` files are untracked and kept.

### One-time setup
**1. Deploy key.** GitHub Actions logs in with its own SSH key. Add its public key to the deploy user's `~/.ssh/authorized_keys` on the server:
```bash
echo "ssh-ed25519 AAAA… github-actions-deploy@alcom" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**2. GitHub settings**, under Settings → Environments → `production` and Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Environment secret | `SSH_HOST` | server IP or hostname |
| Environment secret | `SSH_USER` | user that owns `/opt/alcom` and is in the `docker` group |
| Environment secret | `SSH_PORT` | only if SSH isn't on 22 |
| Environment secret | `SSH_PRIVATE_KEY` | private half of the deploy key |
| Environment secret | `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -H <SSH_HOST>` (pins the server's identity) |
| Repository variable | `SITE_URL` | `https://alcomconsultants.co.ke` |
| Repository variable | `SITE_ENV` | `staging` (blocks indexing) → `production` at launch |
| Repository variable | `APP_DIR` | only if the checkout isn't `/opt/alcom` |

`SITE_URL`/`SITE_ENV` are baked into the frontend image at build time, so change them in GitHub, not only in the server's `.env`.

**3. First run.** Push to `main`, or run **Actions → Deploy → Run workflow**, and watch it in the Actions tab.

## Everyday commands
```bash
cd /opt/alcom
alias dc='docker compose -f compose.yaml -f compose.prod.yaml'
dc ps                              # status and health
dc logs -f --tail=100 backend      # follow logs (frontend, worker, db, …)
dc restart frontend
dc exec backend python manage.py shell
(cd deploy/edge && docker compose logs -f nginx)
```

## Troubleshooting
| Symptom | Check |
|---|---|
| `init-cert.sh` fails | DNS points at this server (step 3); port 80 open (`sudo ufw status`); nothing else on port 80 (`sudo ss -ltnp 'sport = :80'`). Let's Encrypt allows 5 failed validations per hour. Rehearse with `./init-cert.sh --staging`, then delete the test cert (`docker compose run --rm certbot delete --cert-name alcomconsultants.co.ke`) before the real run. |
| `502 Bad Gateway` | App stack not running or unhealthy: `dc ps`, `dc logs backend frontend`. |
| `400 Bad Request` from Django | The domain is missing from `DJANGO_ALLOWED_HOSTS` in `.env`. |
| Admin shows 404 | `ADMIN_PATH` in `deploy/edge/.env` must equal `DJANGO_ADMIN_URL` in `.env` (including the trailing `/`). Recreate Nginx afterwards. |
| Build killed / out of memory | Add swap (step 1). |
| Deploy fails with `CLOUDINARY_URL must look like cloudinary://…` | In `/opt/alcom/.env` the line must be exactly `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`: no quotes, and no second `CLOUDINARY_URL=` (Cloudinary's dashboard copies the name too). The live site keeps running the previous version; re-run Deploy after fixing. |
| Deploy workflow: `Permission denied (publickey)` | The deploy public key isn't in `~/.ssh/authorized_keys` of `SSH_USER`, or `SSH_USER`/`SSH_HOST` is wrong. |
| Deploy workflow: `Host key verification failed` | `SSH_KNOWN_HOSTS` is missing or outdated: re-run `ssh-keyscan -H <host>` and update the secret. |
| Deploy workflow: `denied` when pulling images | On GitHub: Packages → `alcom-backend` / `alcom-frontend-prod` → Package settings → Manage Actions access → add this repository (Read). |
| Deploy workflow failed with "rolled back" | The new version was unhealthy and the previous one is live again. See the workflow log, then `dc logs` on the server. |

## Backups
- **VPS provider snapshots**, as decided in DECISIONS.md. Schedule them daily in the provider's panel.
- Recommended before real client data: a daily database dump to off-site storage.
  ```bash
  dc exec -T db pg_dump -U alcom alcom | gzip > ~/alcom-$(date +%F).sql.gz
  ```

## Security in place
- Only ports 22, 80 and 443 are open. Only the edge Nginx publishes ports; the database and Redis are reachable only inside Docker.
- TLS: Mozilla intermediate profile, HTTP/2, HSTS, with HTTP→HTTPS and www→apex redirects.
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `server_tokens` is off.
- The API is rate limited at Nginx (10 req/s per IP, burst 40, answers `429`) and in Django (DRF throttling using the real client IP).
- Django admin lives at a secret path. API docs are staff-only. Cookies are `Secure`/`HttpOnly`.
- App containers run as non-root, with read-only filesystems where possible and `no-new-privileges`.

## Later
- **Staging** at `staging.alcomconsultants.co.ke`: a second app stack (`COMPOSE_PROJECT_NAME=alcom-staging`) plus a server block in the edge config, with basic auth.
- **Sentry** DSNs and uptime monitoring.
