# Architecture

## 1. High-Level Overview

```
                        Internet (HTTPS, Let's Encrypt)
                                   │
                    ┌──────────────▼──────────────┐
                    │           Nginx             │  TLS, HSTS, gzip, rate limits,
                    │   (reverse proxy, :80/:443) │  security headers, static files
                    └──────┬───────────────┬──────┘
               /  (all)    │               │  /api/*, /<admin-path>/*, /static/*
                    ┌──────▼─────┐   ┌─────▼──────────────┐
                    │  Next.js   │──▶│ Django + DRF        │
                    │ (SSR/ISR)  │   │ (Gunicorn/Uvicorn)  │
                    └────────────┘   └───┬─────────┬───────┘
                                         │         │
                              ┌──────────▼──┐  ┌───▼─────┐   ┌─────────────────┐
                              │ PostgreSQL  │  │  Redis  │◀──│ Celery worker + │
                              │  + PostGIS  │  │         │   │  Celery beat    │
                              └─────────────┘  └─────────┘   └─────────────────┘

  External: Cloudinary (images/video) · SMTP (email) · Sentry · GA4 · OpenStreetMap tiles/Overpass
```

- **Same-origin**: frontend on `alcomconsultants.co.ke`, API on `alcomconsultants.co.ke/api/`. No CORS; cookies are first-party.
- **Staging**: `staging.alcomconsultants.co.ke`, a separate Compose project on the same VPS with its own database. HTTP basic auth and `noindex`.
- **Edge proxy**: because prod and staging share one VPS (and ports 80/443), a single edge Nginx + Certbot stack terminates TLS for both and reaches each app stack over an external `edge` Docker network via per-stack aliases (`alcom-prod-backend`, `alcom-staging-frontend`, …).

## 2. Tech Stack
Versions follow DECISIONS.md: latest LTS where an LTS exists, otherwise latest stable. Pinned at Phase 0.

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript (strict), Tailwind CSS v4, shadcn/ui (Radix) components |
| Frontend data | Server Components fetch for public pages; TanStack Query for the dashboard; React Hook Form + Zod |
| API types | `drf-spectacular` OpenAPI schema → `openapi-typescript` generated client types |
| Maps | Leaflet + react-leaflet + OSM tiles; marker clustering |
| Images | Cloudinary (`next-cloudinary` on the frontend, `cloudinary` + `django-cloudinary-storage` on the backend) |
| Backend | Python 3.14, Django 6.1 (upgrade to 6.2 LTS when released), Django REST Framework, django-filter |
| Auth | `django-allauth` (headless mode): session cookies + CSRF, email verification, TOTP 2FA |
| Database | PostgreSQL (latest stable) + PostGIS; full-text search via `SearchVector`/GIN indexes |
| Async | Celery + Redis (also used for cache and throttling) |
| Rich text | TipTap in the dashboard; HTML sanitised server-side (`nh3`) |
| App server | Gunicorn (gthread workers) for Django; Next.js standalone `server.js` |
| Proxy | Nginx + Certbot (Let's Encrypt) |
| Observability | Sentry (Django + Next.js), structured JSON logs, health endpoints |
| CI/CD | GitHub Actions → GHCR images → SSH deploy |

## 3. Repository Layout (monorepo)

```
.
├── backend/
│   ├── config/                 # settings/{base,dev,prod,test}.py, urls, celery, asgi/wsgi
│   ├── apps/
│   │   ├── core/               # base models (UUID, timestamps), site settings, health
│   │   ├── accounts/           # custom User, profiles, favourites, saved searches
│   │   ├── locations/          # County → Area → Neighbourhood (PostGIS points/polygons)
│   │   ├── listings/           # Property, media, amenities, property types
│   │   ├── projects/           # Development projects, unit types, progress updates
│   │   ├── leads/              # Enquiries, pipeline, notes, follow-ups
│   │   ├── content/            # Blog, team, testimonials, FAQs, careers, pages
│   │   └── notifications/      # Email templates + Celery tasks
│   ├── pyproject.toml + uv.lock
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── (public)/           # marketing + listings pages
│   │   ├── (account)/          # visitor account pages
│   │   └── dashboard/          # staff dashboard (auth-guarded)
│   ├── components/  lib/  types/
│   └── Dockerfile
├── nginx/                      # dev proxy config; edge proxy (TLS) for prod + staging
├── compose.yaml                # shared service definitions
├── compose.override.yaml       # dev overrides, auto-merged (hot reload, Nginx)
├── compose.prod.yaml           # prod/staging overrides (GHCR images, hardening)
├── .github/workflows/          # ci.yml, deploy.yml
└── docs/
```

## 4. Domain Model (Release 1)

```
User ─┬─< Favourite >── Property
      └─< SavedSearch

County ─< Area ─< Neighbourhood
                       │
Property ──────────────┘  (FK neighbourhood, PointField location)
  ├── PropertyType, deal_type, status, price, beds, baths, sizes …
  ├─< PropertyMedia (image | floor_plan | video, order, cloudinary_id)
  ├─>< Amenity
  ├── Project? (optional FK)
  └── contact (FK User/staff)

Project ─< UnitType
        ─< ProjectUpdate
        ─< ProjectMedia

Lead (source: listing | project | contact | management | valuation)
  ├── FK Property? / Project?
  ├── status, assignee (User), follow_up_at, consent flags
  └─< LeadNote

Content: BlogPost (+ Category, Tag), TeamMember, Testimonial, FAQ (+ category), JobOpening, SiteSettings (singleton)
```

Conventions: UUID primary keys exposed publicly (with slugs for SEO URLs), `created_at`/`updated_at` on all models, soft-archive by status rather than hard delete for listings/leads.

## 5. API Design
- REST, versioned: `/api/v1/…`, OpenAPI docs at `/api/v1/schema/` (staff-only in prod).
- Public read endpoints are cacheable; filtering via query params; cursor/page-number pagination.
- Staff endpoints under `/api/v1/dashboard/…`, protected by permission classes.
- Auth endpoints from allauth headless under `/api/v1/auth/…`.
- Errors in a consistent JSON shape; throttling on auth and enquiry endpoints.

## 6. Rendering & Caching
- Public pages: Server Components with **ISR**; Django fires **on-demand revalidation** (`revalidateTag`) via a signed webhook when listings/content change.
- Dashboard: client-side with TanStack Query.
- Images: Cloudinary `f_auto,q_auto`, responsive `sizes`, blurred placeholders.
- Redis cache for expensive queries (filter facets, nearby amenities).

## 7. Security
- Session cookies: `Secure`, `HttpOnly`, `SameSite=Lax`; CSRF on unsafe methods.
- Nginx: HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, request size limits, rate limiting on `/api/`.
- Django admin on a non-default path, superusers only.
- Secrets via `.env` files on the server (never committed); `.env.example` documented.
- Dependency scanning (Dependabot) and `pip-audit`/`npm audit` in CI.
- Non-root containers, read-only filesystems where practical, internal Docker network (only Nginx publishes ports).
