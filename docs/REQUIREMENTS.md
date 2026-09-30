# Requirements — Alcom Consultants Limited Website

Domain: **alcomconsultants.co.ke**
Status: Planning agreed 2026-09-30. Scope below is **Release 1**; deferred items are listed at the end.

## 1. Business Overview
Alcom Consultants offers three services:

| Service | Release 1 scope |
|---|---|
| Property Agency (listings) | **Full**: listings platform, search, map, enquiries, lead CRM |
| Property Management | Marketing page + "Manage my property" enquiry form (leads go into the CRM) |
| Property Valuations | Marketing page + "Request a valuation" enquiry form (leads go into the CRM) |

- Coverage: **all of Kenya** (County → Town/Area → Neighbourhood).
- Language: **English**, i18n-ready so Swahili can be added later.
- Currency: **KES**.
- Only **Alcom staff** publish listings (built so landlords/agents can be allowed later).

## 2. Users & Roles
| Actor | Description |
|---|---|
| Visitor | Browses, searches, enquires. No login required. |
| Registered user | Optional account: favourites and saved-search email alerts. |
| Admin (staff) | Single staff role in R1: manages listings, projects, leads, content, users, settings. Permission system built so more roles (Agent, Manager, Marketing) can be added later. |
| Superuser | Technical owner; Django Admin access. |

## 3. Functional Requirements

### 3.1 Listings
- Deal types: **Sale, Long-term rent, Commercial lease**.
- Property types: apartment, house/bungalow/maisonette, townhouse, land/plot, office, shop/retail, warehouse/industrial, mixed-use (configurable list).
- Fields: title, slug, reference code, description, deal type, property type, price (KES) + price qualifier (per month, per acre, per sqft, "price on request"), bedrooms, bathrooms, size (built/land with units), parking, furnished status, amenities/features (configurable), location (county/area/neighbourhood + lat/lng, with the option to show only an approximate location), assigned staff contact, featured flag, SEO title/description.
- Media: **photo gallery + floor plans** (Cloudinary), **video** (YouTube/Vimeo URL or Cloudinary upload).
- Status lifecycle: `Draft → Published → Under offer → Sold / Let → Archived`.
- **Off-plan / development projects**: project page with developer, completion date, progress updates, unit types (beds, size, price range, availability), gallery, video; individual listings may belong to a project.

### 3.2 Search & Discovery
- Filters: deal type, property type, location (autocomplete), price range, beds, baths, size, amenities, furnished, keyword.
- Sort: newest, price asc/desc.
- **List / Map toggle** (Leaflet + OpenStreetMap), mobile-first filter drawer.
- **Similar listings** on detail page (same area/type/price band).
- **Nearby amenities** on detail map (schools, hospitals, malls, transport) from OpenStreetMap data, cached server-side.
- Shareable URLs (filters in the query string), social share buttons, Open Graph previews.

### 3.3 Enquiries & Lead CRM
- Enquiry channels: **enquiry form** (listing, project, general contact, property management, valuation) and **WhatsApp click-to-chat** pre-filled with listing reference.
- Valuation enquiry form captures purpose: Mortgage/bank, Sale/purchase, Insurance, Other statutory (probate, CGT, rating, court).
- Every form submission creates a **Lead** in the CRM.
- Pipeline: `New → Contacted → Viewing scheduled → Offer / Negotiation → Won / Lost`, with notes, assignee, follow-up date and reminder emails.
- Spam protection: honeypot + rate limiting + Cloudflare Turnstile or hCaptcha (to decide in Phase 3).

### 3.4 Public Accounts (optional for visitors)
- Email + password sign-up with email verification, password reset.
- Favourites (saved listings).
- Saved searches with email alerts (instant/daily/weekly digest).
- Profile: edit details, **export my data**, **delete my account** (DPA 2019).

### 3.5 Staff Dashboard (custom Next.js)
- Login: email + password, **optional TOTP 2FA**.
- CRUD: listings, projects, media ordering, locations, amenities, leads, blog, team, testimonials, FAQs, careers, site settings.
- Overview: listing counts by status, new leads, follow-ups due.
- Mobile-friendly.

### 3.6 Content & SEO
- Pages: Home, Properties (search), Property detail, Projects, Services (Agency, Management, Valuations; may share one layout), About + Team, Blog/Insights, Testimonials, Careers, Contact Us (with FAQs), Privacy, Terms, Cookies.
- **SEO location landing pages**, e.g. `/apartments-for-rent/nairobi/kilimani`, auto-generated from listings + location data.
- XML sitemap, robots.txt, canonical URLs, schema.org (`RealEstateListing`, `Organization`, `BreadcrumbList`, `BlogPosting`), Open Graph/Twitter cards.
- Rich-text editor for blog/pages.

### 3.7 Notifications
- **Email only** in R1: enquiry acknowledgement, new-lead alert to staff, follow-up reminders, saved-search alerts, account emails.
- Dev: Gmail SMTP. Prod: domain email (alcomconsultants.co.ke) with SPF, DKIM, DMARC.

### 3.8 Analytics
- **Google Analytics 4 + Google Search Console**, loaded only after cookie consent.

## 4. Non-Functional Requirements
| Area | Target |
|---|---|
| Mobile-first | Every page fully responsive; designed at 360px first |
| Performance | Lighthouse mobile ≥ 90 (Perf, SEO, Best Practices); LCP < 2.5s; API p95 < 300ms |
| Accessibility | WCAG 2.1 AA |
| Security | OWASP Top 10, HTTPS only, HSTS, CSP, secure cookies, rate limiting, optional 2FA for staff |
| Privacy | Kenya Data Protection Act 2019: consent capture, cookie consent, privacy policy, data export/deletion, retention policy |
| Availability | Uptime monitoring alerts; Sentry error tracking |
| Backups | VPS provider snapshots (see DECISIONS.md) |
| Testing | pytest, Vitest, Playwright, all enforced in CI |

## 5. Legal
- Claude drafts Kenya-specific Privacy Policy, Terms of Use and Cookie Policy; lawyer reviews before launch.
- No professional registration numbers (EARB/VRB) displayed.
- Fresh start: no legacy site or data migration.

## 6. Deferred (later releases)
- Full Property Management system: landlords, units, tenants, leases, invoicing, M-Pesa rent collection, arrears, maintenance, tenant/landlord portals, statements.
- Valuations workflow: quotes, inspections, report storage/delivery, online payment.
- Payments (M-Pesa Daraja, cards).
- SMS / WhatsApp Business API notifications.
- Additional staff roles (Agent, Manager, Marketing).
- Portal syndication (Property24, BuyRentKenya).
- Virtual tours, PDF brochures, mortgage calculator, book-a-viewing, click-to-call.
- Swahili translation, USD pricing, Google sign-in, phone OTP.
