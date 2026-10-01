# Accounts and sign-in

Two kinds of account share one user table and one sign-in system (django-allauth in headless mode; the Next.js app renders every screen):

| | Staff | Readers |
|---|---|---|
| Created by | An admin (Django admin → Users, tick **Staff status**) | Themselves, at `/account/sign-up` (or Google) |
| Sign in at | `/dashboard/login` | `/account/sign-in` |
| Can | Use the dashboard (every dashboard API checks `is_staff`) | Comment on blog articles once their email is confirmed |
| Two-step verification | Optional, recommended (dashboard → Security) | Not offered |

Password reset for both lives at `/account/forgot-password`. The older `/dashboard/forgot-password` and `/dashboard/reset-password/<key>` addresses redirect there, so links in emails already sent keep working.

## Email confirmation

`ACCOUNT_EMAIL_VERIFICATION = "optional"`: readers are signed in straight after signing up and receive a confirmation link (`/account/verify-email/<key>`, valid 3 days). Commenting requires a confirmed address; staff and Google accounts count as confirmed. Verification is not "mandatory" because staff accounts created by an admin have no confirmed address on record, and mandatory verification would stop them signing in.

Emails are sent through the mail server (`noreply@`, docs/MAIL.md). In development without SMTP settings they're printed to the backend logs.

## Google sign-in (one-time setup)

"Continue with Google" appears on the sign-in and sign-up pages once these two settings are present.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. "Alcom Consultants website").
2. **APIs & Services → OAuth consent screen**: choose *External*. Fill in:
   - app name "Alcom Consultants" and the logo
   - support email `info@alcomconsultants.co.ke`
   - authorised domain `alcomconsultants.co.ke`
   - privacy policy `https://alcomconsultants.co.ke/privacy`
   - scopes `email`, `profile` and `openid` only

   Then **publish** the app. With only these basic scopes, Google doesn't require a review.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - type: *Web application*
   - authorised JavaScript origins: `https://alcomconsultants.co.ke`
   - authorised redirect URI: `https://alcomconsultants.co.ke/api/v1/accounts/google/login/callback/`
   - for local testing, also add `http://localhost:8080` and `http://localhost:8080/api/v1/accounts/google/login/callback/`
4. Copy the client ID and secret into the server's `/opt/alcom/.env`:
   ```bash
   GOOGLE_CLIENT_ID=….apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   ```
   Restart the backend:
   ```bash
   cd /opt/alcom && docker compose -f compose.yaml -f compose.prod.yaml up -d backend
   ```

New Google users become readers with a confirmed email. If someone already has an email account with the same address, Google sign-in does not merge into it automatically. This stops a Google login from bypassing a staff member's password and two-step verification.

## Comments

- Comments appear immediately.
- Each reader is limited to 5 comments a minute and 50 a day, with at most 2 links per comment and 2,000 characters.
- Names show as first name and last initial ("Jane W."), never the email address. Staff show as "Name (Alcom Consultants)".
- Staff moderate at **Dashboard → Blog → Comments**. Hiding a comment takes it off the site and can be undone; deleting it is permanent.
- Readers can delete their own comments.
