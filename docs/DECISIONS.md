## Packages and Libraries
- When installing a library lets say nodejs or postgres, always go with the latest LTS version for perfect compatibility.
- Avoid older versions on new untested versions
- All docker images should be the LTS version of each
- Before writing any code confirm there is no existing code/components in the project that can be reused
  

## Images Usage
- Any images used in this project will be stored in an cloudinary. Credentials will be provided for the server in an env.
- Display of images should always be optimized using cloudinary transformations/recommendations for a favourable loading speeds.
- Refer Django integration: https://cloudinary.com/documentation/django_integration
- Refer Nexjs integration: https://cloudinary.com/documentation/nextjs_integration
  
## Emails Testing
- For development, I will test with GMail SMTP 
- For production, A domain based email will be used or configured

## UI design
- I have added some inspirational images for some parts of the app to help in design(./inspirationl_images)
- Adopt brand colors used in the logo
Mobile First: Over 60% of property browsing happens on mobile screens. Pay close attention to how map/list toggles and filter modals behave on mobile screens. Every component, page or screen should be fully responsive

## Planning Decisions (2026-09-30)

### Scope
- Release 1 = listings platform (Sale, Long-term rent, Commercial lease; off-plan projects) + lead CRM + marketing site.
- Property Management and Valuations are **marketing pages + enquiry forms only** in R1; their full systems are deferred.
- Only Alcom staff publish listings. Coverage: all of Kenya. English + KES (i18n-ready).
- No online payments, SMS or WhatsApp API in R1. WhatsApp is click-to-chat only.

### Users & Auth
- Single staff role: **Admin** (permission system designed for more roles later).
- Custom **Next.js staff dashboard**; Django Admin for superusers only, on a non-default path.
- Email + password auth (django-allauth headless, session cookies + CSRF). **2FA (TOTP) optional** for staff.
- Optional visitor accounts for favourites and saved-search alerts.

### Frontend
- Maps: **Leaflet + OpenStreetMap** (no paid map API).
- Listing media: photos, floor plans, video. Enquiry channels: form + WhatsApp.
- Buyer tools: similar listings, nearby amenities.

### Infrastructure
- Existing VPS (specs to confirm). Staging on the same VPS at `staging.alcomconsultants.co.ke`.
- **No Cloudflare**; Let's Encrypt for SSL. Frontend at the domain root, backend under `/api`.
- GitHub + GitHub Actions → GHCR → SSH deploy.
- Celery + Redis for background jobs. Sentry for error tracking.
- Notifications: email only. Analytics: GA4 + Search Console (after cookie consent).
- **Backups: VPS provider snapshots.** Accepted risk: snapshots are not off-site, may not be crash-consistent for Postgres, and restore the whole server. Revisit by adding a daily `pg_dump` to off-site storage (Backblaze B2 costs a few cents a month) before real client data accumulates.

### Compliance & Process
- Full Kenya DPA 2019 kit: consent capture, cookie consent, privacy policy, data export/deletion, retention.
- Claude drafts legal texts; a lawyer reviews them. No EARB/VRB numbers displayed. No legacy migration.
- Brand colours/fonts extracted from the logo (proposed for approval).
- Full testing: pytest, Vitest, Playwright in CI. Solo developer: feature branches → PR → `main`, conventional commits.
