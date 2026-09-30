# Roadmap

No hard deadline; quality first. Each phase ends with passing CI, deployment to staging, and your review before the next phase starts.

## Release 1: Listings platform + marketing site

### Phase 0: Foundation
- Monorepo structure, `.gitignore`, `.editorconfig`, pre-commit (ruff, prettier, eslint)
- Django project (settings split, custom User model, core app, health endpoint, DRF, OpenAPI)
- Next.js cleanup/config (standalone output, env handling, lint/format, Vitest, Playwright)
- Docker: backend/frontend Dockerfiles (multi-stage, non-root), Compose dev/prod, Postgres+PostGIS, Redis, Celery
- GitHub repo, CI workflow, Dependabot

### Phase 1: Design system and public shell
- Brand tokens from the logo (colours, typography, spacing), shadcn/ui setup
- Header/nav (mobile menu), footer, layout, 404/500 pages
- Home page (hero search, featured listings placeholder, services, CTA)
- Static pages: About, Services, Contact (with FAQs), legal page stubs
- **Staging live**: VPS hardening, Nginx, Let's Encrypt, deploy workflow

### Phase 2: Listings core
- Locations (Kenya counties → areas → neighbourhoods seed data), property types, amenities
- Property + media models, Cloudinary integration, API
- Staff dashboard: auth (2FA optional), listing CRUD, media upload/reorder, publish workflow
- Public: search page (filters, list/map toggle, mobile filter drawer), property detail (gallery, video, floor plans, map, nearby amenities, similar listings)
- Development projects: models, dashboard, public project pages

### Phase 3: Enquiries and CRM
- Enquiry forms (listing, project, contact, management, valuation), consent capture, spam protection
- WhatsApp click-to-chat
- Lead pipeline in the dashboard, notes, follow-up reminders
- Email notifications via Celery (templates, branding)

### Phase 4: Visitor accounts
- Sign up/verify/login/reset, profile
- Favourites, saved searches, email alerts (Celery beat)
- Data export and account deletion

### Phase 5: Content and SEO
- Blog/Insights (TipTap editor), Team, Testimonials, FAQs, Careers
- SEO location landing pages, sitemap, robots, schema.org, Open Graph images
- Cookie consent + GA4 + Search Console

### Phase 6: Hardening and launch
- Security review, performance and accessibility audits, Lighthouse ≥ 90
- Legal texts finalised (after lawyer review)
- Production deployment, snapshots, Sentry alerts, go-live checklist

## Later releases (backlog)
- Property Management system (landlords, tenants, leases, invoicing, M-Pesa, portals)
- Valuations workflow (quotes, inspections, report delivery, payments)
- SMS / WhatsApp notifications, more staff roles, Swahili, portal syndication
