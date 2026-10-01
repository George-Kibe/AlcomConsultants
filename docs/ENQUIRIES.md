# Enquiries and leads

Every enquiry form on the website creates a lead in the dashboard (**Dashboard → Enquiries**), emails the office and sends the visitor a confirmation.

| Form | Where | Asks for |
|---|---|---|
| Property enquiry | Every property page ("Send an enquiry") | Name, email, phone, message; the listing is attached |
| General enquiry | `/contact`, and the Estate Agency service page | Name, email, phone, message (required) |
| Valuation request | Valuation Services page (`#enquire`) | Type of property, location (required), purpose |
| Property management | Property Management page (`#enquire`) | Type of property, location (required), number of units |

Signed-in visitors see their details filled in. Their enquiries are linked to the account and included in "Download my data". When they delete the account, the enquiries stay with the office.

## Emails

The Celery worker sends these, so a slow or unavailable mail server never affects someone submitting a form. Failed sends are retried for about 25 minutes.

- **To the office**: every new enquiry goes to `ENQUIRY_NOTIFY_EMAILS` (default `info@alcomconsultants.co.ke`; separate several addresses with commas). Replying answers the visitor directly (`Reply-To`), and the email links to the lead in the dashboard.
- **To the visitor**: a confirmation with the reference (`E-1001`, …) and the office phone and WhatsApp. It never repeats the visitor's message back, so the form can't be used to send arbitrary text to someone else's address.
- **Follow-up reminders**: every morning at 07:30 (Nairobi time), each staff member gets one email listing their leads due for follow-up that day or overdue. Due leads that nobody is assigned to go to the office inbox.

All emails share a branded layout (`backend/templates/email/base.html`).

## Lead pipeline

Stages: **New → Contacted → Viewing → Negotiating → Won / Lost**. Valuation and management leads usually skip Viewing.

For each lead, staff can change the stage, assign a staff member, set a follow-up date, add notes and mark it as spam. Every change is recorded on the lead's timeline with who made it. The dashboard overview shows new enquiries, follow-ups due and leads assigned to you. The Enquiries page has views for open leads, follow-ups due, assigned to me, unassigned, won, lost and spam.

Deleting a lead removes it and its notes permanently. Use it for spam or when someone asks to be forgotten; otherwise mark the lead as lost.

## Spam protection

1. **Cloudflare Turnstile**, once keys are set (below). It is usually invisible; Cloudflare only shows a challenge when a visit looks automated. If Cloudflare can't be reached, the enquiry is still accepted and marked "unverified" on the lead, so no real lead is lost.
2. **Timing**: forms carry a signed token. Submissions within 3 seconds of the form appearing are refused with "please wait a moment", and tokens older than a day expire.
3. **Honeypot**: a hidden field that people never see. Bots that fill it in get a normal-looking reply, and nothing is saved.
4. **Limits**: 5 enquiries a minute and 30 a day from one IP address, at most 2 links in a message, and no links in names.

### Turnstile setup (one time)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (a free account is enough; the domain does not need to use Cloudflare DNS).
2. Go to **Turnstile → Add widget**: name "Alcom website", hostname `alcomconsultants.co.ke` (add `localhost` for local trials), widget mode **Managed**.
3. Copy the site key and secret key into the server's `/opt/alcom/.env`:
   ```bash
   TURNSTILE_SITE_KEY=0x4AAAAAA…
   TURNSTILE_SECRET_KEY=0x4AAAAAA…
   ```
4. Restart the backend:
   ```bash
   cd /opt/alcom && docker compose -f compose.yaml -f compose.prod.yaml up -d backend
   ```

The site key reaches the forms through the API, so no rebuild is needed. For local trials, Cloudflare's always-pass test keys are listed in `.env.example`.

## Consent and data

Each form asks the visitor to agree that Alcom may use their details to respond, with a link to the Privacy Policy. The lead stores when they agreed and which version of the wording they saw (`CONSENT_VERSION` in `apps/enquiries/models.py`). Change the version whenever the wording changes. IP addresses are not stored.
