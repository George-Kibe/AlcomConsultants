# Roadmap

No hard deadline; quality first. Each step ends with passing CI (incl. full-stack E2E), an automatic deploy and your review.

**Status (2026-10-01):** Phase 0 ✅ · Phase 1 ✅ except real company details · Phase 2 in progress (2a ✅, 2b-1 ✅)

## Release 1: Listings platform + marketing site

### Phase 0: Foundation ✅
- [x] Monorepo structure, `.gitignore`, `.editorconfig`, pre-commit (ruff, prettier, eslint, gitleaks)
- [x] Django 6.1 project (settings split, custom User model, core app, health endpoint, DRF, OpenAPI)
- [x] Next.js 16 config (standalone output, env handling, lint/format, Vitest, Playwright)
- [x] Docker: backend/frontend Dockerfiles (multi-stage, non-root), Compose dev/prod, Postgres 18 + PostGIS, Redis 8, Celery
- [x] GitHub repo, CI workflow, Dependabot

### Phase 1: Design system and public shell ✅ (except real content)
- [x] Brand tokens from the logo (colours, typography, spacing), shadcn/ui setup, light/dark theme
- [x] Header/nav (mobile menu), footer with Nairobi skyline, floating WhatsApp button, 404/error pages
- [x] Home page (10-photo hero slideshow + search hand-off, featured properties*, services, why Alcom, CTA). *Sample listings until 2c
- [x] Static pages: About, Services (+ one page per service), Contact (with FAQs), Properties placeholder, legal page stubs
- [x] Automated WCAG 2 AA checks (axe) on every page in both themes, mobile + desktop
- [x] Site images on Cloudinary (hero + sample listings via `next-cloudinary`; responsive AVIF/WebP)
- [x] **Live** at https://alcomconsultants.co.ke: edge Nginx, Let's Encrypt with automatic renewal, automatic deploys on push to `main` (CI-built images, health gate, rollback). Indexing blocked (`SITE_ENV=staging`) until launch
- [x] VPS: firewall (22/80/443), fail2ban, key-based SSH (`ssh alcom_vps`)
- [ ] VPS: switch off SSH password login (after confirming provider web-console access)
- [ ] Real company details and copy review (placeholders marked `TODO(content)`)
- Deferred (decided 2026-10-01): separate staging site at staging.alcomconsultants.co.ke; revisit after launch (the edge proxy already supports a second stack)

### Phase 2: Listings core
- [x] **2a** Locations (47 counties + 69 seeded areas → neighbourhoods), property types, amenities
- [x] **2a** Property, media (Cloudinary) and development-project models, Django admin with photo upload, public read API (search filters, sorting, detail, location autocomplete, projects)
- [x] **2b-1** Staff dashboard: sign-in (email + password, optional 2-step verification, recovery codes, password reset/change), dashboard shell, overview; full-stack E2E in CI
- [x] **2b-2** Listing management: list (status tabs, search, sort), create/edit form, publish / archive / delete-draft, audit (created_by / updated_by)
- [x] **2b-3** Photos: signed direct uploads to Cloudinary (server-verified), progress, drag / keyboard reorder, cover, alt text, floor plans, delete with Cloudinary clean-up
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
