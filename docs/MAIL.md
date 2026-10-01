# Mail server

Self-hosted email for `@alcomconsultants.co.ke` using [Mailu](https://mailu.io) 2024.06, running on the production VPS next to the website (`deploy/mail`).

| | |
|---|---|
| Webmail | https://mail.alcomconsultants.co.ke (Roundcube) |
| Admin UI | https://mail.alcomconsultants.co.ke/admin (sign in as `admin@`) |
| Mailboxes | `info@` (public address), `noreply@` (website notifications), `admin@` (postmaster, DMARC reports, Mailu admin) |
| Mail clients | IMAP `mail.alcomconsultants.co.ke:993` (SSL/TLS); SMTP `mail.alcomconsultants.co.ke:465` (SSL/TLS); username = full email address |

## How it fits together

- **Ports.** Port 25 receives mail from other servers. 465 (sending) and 993 (IMAP) use implicit TLS. Mailu keeps the STARTTLS ports (587, 143) closed by default (RFC 8314, [nostarttls](https://nostarttls.secvuln.info/)).
- **Web.** The edge Nginx terminates HTTPS for `mail.<domain>` and proxies to Mailu's front container over the shared `edge` network (`deploy/edge/nginx/templates/mail.conf.template`).
- **TLS.** The mail ports use the edge's Let's Encrypt certificate for `mail.<domain>`, read straight from the `edge_letsencrypt` volume. `deploy/edge/renew-certs.sh` reloads Mailu after renewals.
- **Filtering.** Rspamd handles spam (with DKIM signing, SPF, DMARC and greylisting), ClamAV handles viruses, and oletools catches Office macros. Unbound validates DNSSEC.
- **Website.** Django sends as `noreply@` through port 465 (`EMAIL_USE_SSL=true`).
- **Data.** Everything lives in Docker volumes named `mail_*`. Mailboxes are in `mail_mail`, the DKIM key in `mail_dkim` and settings in `mail_data`. Include them in server backups.

## DNS

Records at the registrar's DNS (rcnoc nameservers). Check them with `dig +short <type> <name>`.

| Type | Name | Value |
|---|---|---|
| A | `mail` | `178.162.254.192` (an A record, not a CNAME: MX targets must not be CNAMEs) |
| MX | `@` | `10 mail.alcomconsultants.co.ke` |
| TXT | `@` | `v=spf1 mx ~all` (move to `-all` once mail has flowed cleanly for a few weeks) |
| TXT | `dkim._domainkey` | `v=DKIM1; k=rsa; p=…` (public key below) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@alcomconsultants.co.ke` (move to `p=quarantine` after reviewing a few weeks of reports) |
| CNAME | `autoconfig` | `mail.alcomconsultants.co.ke` (optional: lets Thunderbird and similar clients set themselves up) |

The VPS provider must also set **reverse DNS (PTR)** for `178.162.254.192` to `mail.alcomconsultants.co.ke`. Gmail and Outlook reject or spam-folder mail from IPs without a matching PTR.

The DKIM public key is derived from the private key in `mail_dkim`:

```bash
docker run --rm -v mail_dkim:/dkim alpine:3.22 sh -c \
  "apk add -q openssl >/dev/null; openssl rsa -in /dkim/alcomconsultants.co.ke.dkim.key -pubout -outform DER 2>/dev/null | base64 | tr -d '\n'"
```

## First start on the server

Once the A, MX, SPF, DKIM and DMARC records resolve:

```bash
ssh alcom_vps
cd /opt/alcom/deploy/mail
./setup.sh
```

`setup.sh` is idempotent. It does the following:
1. Writes `mailu.env` with fresh secrets.
2. Ensures the DKIM key exists.
3. Gets the `mail.<domain>` certificate via the edge certbot.
4. Opens ports 25, 465 and 993 in ufw.
5. Starts the stack.
6. Creates the domain and the three mailboxes.

New mailbox passwords are written to `/root/mail-credentials.txt` (root-only) and never printed. Mailu asks for a new password at the first webmail sign-in. Move the passwords into a password manager, then delete the file. The `noreply@` password goes straight into `/opt/alcom/.env`. Apply it with:

```bash
cd /opt/alcom && docker compose -f compose.yaml -f compose.prod.yaml up -d backend worker
docker compose -f compose.yaml -f compose.prod.yaml exec backend python manage.py sendtestemail you@example.com
```

## Testing

`deploy/mail/test_mail.py` runs end-to-end checks:
- sending on 465 and delivery to an inbox on 993
- DKIM signing
- wrong passwords rejected
- not an open relay
- EICAR virus rejected
- trusted certificate (live only)

**Locally**, on a laptop with Docker:

```bash
cd deploy/mail
./local.sh up      # Mailu with a self-signed cert; webmail on http://localhost:8025
./local.sh test
./local.sh down    # add -v to delete the local mail data
```

**Live**, from anywhere:

```bash
MAIL_TEST_PASSWORD='<info@ and noreply@ password>' MAIL_TEST_EXTERNAL_TO=you@gmail.com python3 deploy/mail/test_mail.py
```

Then open the message in Gmail → ⋮ → *Show original*. SPF, DKIM and DMARC should all read **PASS**. [mail-tester.com](https://www.mail-tester.com) gives a deliverability score.

## Everyday tasks

- **Add a mailbox or alias:** Admin UI → *Mail domains* → `alcomconsultants.co.ke` → *Users* / *Aliases*. The VPS can comfortably handle 10+ mailboxes.
- **Change a password:** webmail → *Settings* → *Password*, or the Admin UI.
- **Upgrade Mailu:** check the [release notes](https://mailu.io/master/releases.html), then run `docker compose pull && docker compose up -d` in `deploy/mail`. Patch releases (`2024.06.x`) arrive automatically with each pull. For a new major version, change `MAILU_VERSION` and read the upgrade notes first.
- **Logs:** run `docker compose logs -f front smtp antispam` in `deploy/mail`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Gmail puts mail in spam or rejects it | PTR set? `dig +short -x 178.162.254.192` should return `mail.alcomconsultants.co.ke.`. Check SPF/DKIM/DMARC in *Show original* and the IP on blocklists (mxtoolbox.com). |
| No incoming mail | `dig +short MX alcomconsultants.co.ke`; port 25 reachable from outside (`nc -vz mail.alcomconsultants.co.ke 25`); `docker compose logs smtp`. |
| Mail clients complain about the certificate | `docker compose logs front`; the cert exists in `edge_letsencrypt` at `live/mail.alcomconsultants.co.ke/`. |
| Website emails fail | Check `EMAIL_*` in `/opt/alcom/.env`, then `docker compose -f compose.yaml -f compose.prod.yaml logs backend worker`. The noreply@ account must exist and not be rate-limited (`MESSAGE_RATELIMIT` in `mailu.env`). |
