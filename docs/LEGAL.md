# Legal pages: notes for the lawyer's review

The Privacy Policy (`/privacy`), Terms of Use (`/terms`) and Cookie Policy (`/cookies`) went live on 2 October 2026 as drafts written from how the website actually works. They are pending review by Alcom's advocate. Text lives in `frontend/app/(site)/{privacy,terms,cookies}/page.tsx`; change the "Last updated" date with any edit.

## Points to confirm

**Privacy Policy**
- Registration with the Office of the Data Protection Commissioner as a data controller (and processor, for property management): the policy does not quote a registration number. Add it if Alcom is registered or required to register.
- Retention periods (section 6) are proposals: enquiries 2 years after last contact; client and transaction records 7 years; job applications 12 months; analytics 14 months (set Google Analytics → Admin → Data retention to 14 months to match); server logs a few weeks.
- Lawful bases (section 3), especially consent for enquiries and legitimate interests for security.
- International transfers (section 5): the providers are the hosting provider in Germany, Cloudflare, Cloudinary, Google and Sentry. Confirm the safeguards wording against sections 48–50 of the Act and the 2021 General Regulations.
- Whether a named data protection officer or contact person should be listed.
- Anti-money laundering obligations for estate agents (Proceeds of Crime and Anti-Money Laundering Act), mentioned under legal obligations.

**Terms of Use**
- Company details: add the registration number and registered office if required.
- The limitation of liability (section 10) against the Consumer Protection Act, 2012.
- The minimum age for accounts (18).
- The anti-fraud warning about deposits (section 3), and whether to name official payment channels.
- Jurisdiction: courts of Kenya (section 12). Consider whether mediation or arbitration should come first.

**Cookie Policy**
- It reflects the cookies actually set: `sessionid` (1 week), `csrftoken` (1 year), local storage, and Google Analytics `_ga` / `_ga_<ID>` (2 years) only after consent.
