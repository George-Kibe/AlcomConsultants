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
- [x] Brand tokens from the logo (colours, typography, spacing), shadcn/ui setup, light/dark theme
- [x] Header/nav (mobile menu), footer with Nairobi skyline, floating WhatsApp button, 404/error pages
- [x] Home page (hero + search hand-off, services, why Alcom, CTA)
- [x] Static pages: About, Services (+ one page per service), Contact (with FAQs), Properties placeholder, legal page stubs
- [x] Automated WCAG 2 AA checks (axe) on every page in both themes, mobile + desktop
- [ ] Real company details and copy review (placeholders marked `TODO(content)`)
- [ ] Images on Cloudinary (needs credentials)
- [ ] **Staging live**: VPS hardening, edge Nginx, Let's Encrypt, deploy workflow (needs VPS access + DNS)

### Phase 2: Listings core
- [x] **2a** Locations (47 counties + 69 seeded areas → neighbourhoods), property types, amenities
- [x] **2a** Property, media (Cloudinary) and development-project models, Django admin with photo upload, public read API (search filters, sorting, detail, location autocomplete, projects)
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
