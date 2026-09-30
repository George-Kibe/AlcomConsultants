# Deployment

## Environments
| Env | URL | Where | Notes |
|---|---|---|---|
| Development | `localhost:8080` | Developer machine, `make up` (`docker compose up`) | Hot reload, Mailpit/Gmail SMTP, debug on |
| Staging | `https://staging.alcomconsultants.co.ke` | Same VPS, Compose project `alcom-staging` | Separate DB/Redis/volumes, basic auth, `noindex`, deployed on merge to `main` |
| Production | `https://alcomconsultants.co.ke` (+ `www` → 301 to apex) | VPS, Compose project `alcom-prod` | Deployed on version tag (`v*`) after staging is verified |

## Routing (Nginx)
| Path | Upstream |
|---|---|
| `/api/` | Django |
| `/<secret-admin-path>/` | Django admin |
| `/static/` | Django static files (served by Nginx from a volume) |
| everything else | Next.js |

TLS: Let's Encrypt via Certbot (HTTP-01), auto-renew with a scheduled job and Nginx reload. No Cloudflare.

## DNS Records (to set at the registrar)
- `A @` → VPS IP; `A www` → VPS IP; `A staging` → VPS IP
- Email: MX + SPF + DKIM + DMARC for the domain mail provider (to confirm provider)

## CI/CD (GitHub Actions)
1. **CI (every PR)**: lint (ruff, eslint), type-check (mypy optional, tsc), tests (pytest with Postgres service, Vitest, Playwright against Compose), build images.
2. **Deploy staging (merge to `main`)**: build and push images to GHCR tagged with the commit SHA → SSH to VPS → `docker compose pull && up -d` → run migrations → health check.
3. **Deploy production (tag `v*`)**: promote the same backend image SHA → migrate → health check → notify.
   The frontend image is built per environment (`alcom-frontend-staging`, `alcom-frontend-prod`) because `NEXT_PUBLIC_*` values and prerendered pages are baked in at build time.

## Server Baseline (VPS)
- Non-root deploy user with SSH key only; password login and root login disabled.
- UFW: allow 22, 80, 443 only. fail2ban.
- Unattended security upgrades.
- Docker Engine + Compose plugin; log rotation for containers.
- VPS specs: **to confirm**. Run `nproc; free -h; df -h; lsb_release -a` on the server and share the output.

## Backups
- **VPS provider snapshots** (chosen). See the risk note in DECISIONS.md.
- Provider snapshots should be scheduled at least daily if the provider allows.

## Monitoring
- Sentry for Django and Next.js (separate projects, `environment` tag for staging/prod).
- Health endpoints: `/api/v1/health/` (DB + Redis check), Next.js `/healthz` (outside `/api`, which Nginx routes to Django).

## Go-Live Checklist (to expand in the deployment phase)
- [ ] DNS propagated, TLS valid (A+ on SSL Labs)
- [ ] `DEBUG=False`, secure settings pass `manage.py check --deploy`
- [ ] Email SPF/DKIM/DMARC pass (mail-tester ≥ 9/10)
- [ ] Sitemap submitted in Search Console, GA4 receiving events after consent
- [ ] Legal pages reviewed by lawyer
- [ ] Snapshot schedule confirmed and one restore tested
- [ ] Lighthouse mobile ≥ 90
