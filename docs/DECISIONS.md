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

### Framework versions (updated 2026-09-30)
- **Django 6.1** (latest release) instead of 5.2 LTS. 6.1 is not an LTS release; its security support ends around December 2027. **Upgrade to Django 6.2 LTS after its release (April 2027).**
- Development email uses Gmail SMTP directly (no local mail catcher). Production uses the domain mail provider.

### Design system (Phase 1, 2026-09-30)
- **Theme**: light by default with a user dark-mode toggle (next-themes, remembered per browser).
- **Font**: Montserrat (Google Fonts, self-hosted by `next/font`); replaced Outfit at the client's request.
- **Colours**: logo navy `#27225C`, green `#3EB354`, red `#EC232C`. The logo green/red fail WCAG AA as text on white, so text and buttons use darker variants (`#1E7B36`, `#C4161F`); logo colours are kept for decoration. Dark mode is near-neutral charcoal (`#121216`) with off-white primary buttons; the earlier navy/purple tint was too strong. All tokens live in `frontend/app/globals.css`.
- **Components**: shadcn/ui (Radix base, "nova" preset), lucide icons; brand icons (WhatsApp, social) are local SVGs because lucide dropped brand marks.
- Use prefetch components when there are API calls or something pending.
- **Logo assets**: generated from the original PNG into `public/brand/` (transparent, mark-only, and light variants for dark backgrounds); favicon and Apple icon in `app/`.
- **Accessibility**: every page is checked with axe (WCAG 2 A/AA) in light and dark themes on mobile and desktop in CI.

### Home page hero (2026-09-30)
- Crossfading slideshow of **10 photos**: 3 of Alcom's own Nairobi skyline shots + 7 Unsplash photos (free for commercial use under the Unsplash License; sources recorded in `frontend/lib/hero-slides.ts`). Replace stock photos with real Alcom properties over time.
- 4 s per slide with a gentle zoom and a light neutral overlay (text stays legible via shadow); visible pause/play and per-photo dots (WCAG 2.2.2); no autoplay for reduced-motion users; pauses while the tab is hidden.
- Only the first photo loads up front (Next.js `preload`), then one slide ahead, so first load is ~360 KB of images on desktop and ~190 KB on mobile.
- Served by Cloudinary (`alcom_images/site/hero/…`, `alcom_images/site/sample-properties/…`) through `next-cloudinary`'s `CldImage` (wrapped as `CloudImage`): resized per screen width, AVIF/WebP, automatic quality. Site imagery is shared by all environments.

### Featured properties (2026-09-30)
- Home page shows 6 featured properties between the hero and "How we can help": swipeable row on mobile, grid on tablet/desktop.
- **Until the listings API exists (Phase 2) the cards use SAMPLE data** (`frontend/lib/sample-properties.ts`, Unsplash photos). They must be replaced by real featured listings before launch. Card links go to `/properties` until listing detail pages exist.

### Staff authentication (Phase 2b, 2026-10-01)
- **django-allauth (headless mode)**: the Next.js dashboard renders every screen and calls `/api/v1/auth/browser/v1/…` with the Django session cookie and CSRF token (same origin, so there are no tokens in JavaScript storage).
- Email + password sign-in; **optional TOTP two-step verification** with recovery codes; sensitive changes ask for the password again.
- **Sign-up closed**: staff accounts are created by an admin (visitor accounts come in Phase 4). Dashboard API requires `is_staff`.
- Brute-force protection: allauth's login rate limits (`too_many_login_attempts`), plus the Nginx API rate limit.
- `proxy.ts` only does an optimistic redirect to `/dashboard/login`; Django authorises every request.
- Password-reset emails need production email settings (`EMAIL_*` in the server `.env`).
- Frontend API types are generated from the OpenAPI schema (`make api-types`); CI fails if they are stale.

### Listing photos (Phase 2b-3, 2026-10-01)
- **Signed direct uploads**: the browser asks the API for signed parameters (images only, the listings folder, 20 MB) and uploads straight to Cloudinary, so large files never pass through our servers. The API then **verifies Cloudinary's response signature** and the folder before attaching the photo.
- Order = display order; the first photo is the cover. Reorder by drag or keyboard (dnd-kit).
- Deleting a photo (or a draft listing) removes the file from Cloudinary via a retried Celery task.
- Videos stay as YouTube/Vimeo links (no video uploads).

## Public listings (2026-10-01)
- Search state lives in the URL (shareable, back-button friendly, server-rendered for SEO); the page fetches from the API server-side (`API_INTERNAL_URL`).
- Maps: Leaflet + OpenStreetMap tiles, no API key. Markers are clustered in the browser (the map endpoint caps at 500 points). Exact pins only when the listing allows it; otherwise an 800 m circle.
- Nearby places: OpenStreetMap Overpass (two mirrors with failover), cached 7 days per listing; failures are cached briefly and shown as nothing rather than an error.
- Videos load only after a click (youtube-nocookie / Vimeo `dnt`), so no third-party cookies by default.
- Production has no demo data; `seed_demo_listings` refuses to run unless `DEBUG` (or `--allow-production`).

## Mail server (2026-10-01)
- Self-hosted Mailu 2024.06 on the production VPS (decided by the owner over a hosted provider): mailboxes `info@`, `noreply@`, `admin@`; scales to ~10 via the admin UI. Runbook: `docs/MAIL.md`.
- Implicit TLS only for clients (465 sending, 993 IMAP); Mailu's default of keeping STARTTLS ports closed is kept. Django uses `EMAIL_USE_SSL` on 465.
- One certificate authority on the box: the edge certbot issues `mail.<domain>` and Mailu reads it from the shared volume; the edge vhost loads that certificate per handshake so the edge never fails to start before mail exists.
- The DKIM key is generated on the server (never leaves it) before first start, so all DNS records could be published in one go.
- Mailbox passwords are generated on the server into a root-only file and must be changed at first sign-in; the website's `noreply@` password is written straight into the app's `.env`.

## Blog (2026-10-01)
- Articles have one cover photo and a rich-text body (owner's choice). The dashboard editor is Tiptap 3 (StarterKit, H2/H3 only, no inline images); the body is stored as HTML and sanitised on every save with nh3 (allow-list in `apps/blog/html.py`), so the public page can render it directly.
- Publishing requires a body and a cover photo; published articles are unpublished (back to draft) rather than deleted, mirroring listings.
- Covers use the same signed direct-upload flow as listing photos (`target: "blog"`), and replaced or deleted covers are removed from Cloudinary.
- JSON-LD is serialised with `<` escaped (`lib/json-ld.ts`) so content can never close the script tag.
- Comments (signed-in readers, published instantly, staff can hide) follow in 2f-2 together with reader accounts.

## Reader accounts and comments (2026-10-01)
- Commenting requires a signed-in reader with a confirmed email (owner's choice: email with verification, or Google; comments publish instantly and staff can hide them). Details and the Google setup: `docs/AUTH.md`.
- Email verification is "optional" with a confirmation link rather than "mandatory" with a code: allauth only supports codes with mandatory verification, which would lock out admin-created staff accounts. Commenting checks for a confirmed address instead.
- Readers and staff share allauth; dashboard access stays `is_staff`-only on every API, so opening sign-up cannot grant dashboard access. Google accounts are not auto-merged into existing accounts by email.
- Password reset moved to `/account/*` for everyone; old dashboard reset URLs redirect.

## Visitor accounts (Phase 4, 2026-10-02)
- Owner's choices: saved-search emails are a **daily digest only**; tapping the heart while signed out **asks the visitor to sign in** (no device-only favourites); deleting an account **keeps blog comments as "Former reader"**; the profile covers name, phone, password and a marketing opt-in (email changes are not offered).
- Reader sign-up from Phase 2f-2 is reused: the same accounts now also hold favourites and saved searches (`apps.saved`).
- Alerts go only to confirmed addresses, so nobody can sign up a stranger's email for daily mail.
- Saved searches store a normalised `/properties` query string and are matched with the public `PropertyFilter`, so alerts always agree with the search page.
- Digest emails keep `List-Unsubscribe` on one header line: Python's default email policy would otherwise fold the long URL into RFC 2047 encoded-words, which mail providers ignore.
- The blog's new-article page accepts the cover photo before the first save (`cover_upload` on create), so an article can be written and published in one go.

## Enquiries and CRM (Phase 3, 2026-10-02)
- Owner's choices: spam protection with **Cloudflare Turnstile** (plus built-in timing, honeypot and rate limits); new enquiries go to the **shared inbox only** (staff assign them in the dashboard); pipeline **New → Contacted → Viewing → Negotiating → Won / Lost**; follow-up reminders in the **dashboard and a morning email**.
- Enquiries are kept separate from listings and accounts (`apps.enquiries`). A lead keeps a snapshot of the listing ("ALC-S-1001 title") so it still makes sense if the listing is deleted.
- If Cloudflare can't be reached, the enquiry is accepted and marked "unverified" rather than refused: losing a real lead costs more than one extra spam message.
- The visitor's confirmation email never repeats their message, so the form can't relay arbitrary text to a third party.
- Forms submit with `onSubmit`, not React form actions: React resets a form after its action runs, which wiped what visitors had typed whenever there was an error. The sign-in, sign-up and password-reset forms were changed the same way.
- Demo data was seeded in production on the owner's request (10 listings, 5 articles) for testing; it is removed before launch (Phase 6 checklist).

## Site content (Phase 5a, 2026-10-02)
- Owner's choices: team, testimonials, FAQs and careers are **editable in the dashboard**; job applications are **by email only** (the website stores no CVs).
- Each section hides itself until it has published items, so nothing looks empty before Alcom adds content. No sample team members or testimonials are seeded, because invented people or quotes must never reach production.
- Pages that show this content render per request (`connection()`), so dashboard edits appear immediately without a rebuild.
- Ordering uses Move up / Move down buttons rather than drag and drop: it works the same with a keyboard and on phones.

