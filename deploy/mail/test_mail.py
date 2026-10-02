#!/usr/bin/env python3
"""End-to-end checks for the mail server (standard library only).

Local:  ./local.sh test
Live:   MAIL_TEST_INFO_PASSWORD=... MAIL_TEST_NOREPLY_PASSWORD=... \
          [MAIL_TEST_EXTERNAL_TO=you@gmail.com] python3 test_mail.py
        (MAIL_TEST_PASSWORD sets both at once; MAIL_TEST_SKIP_RELAY=1 when running on the
        mail server itself, where port 25 traffic comes from a trusted address)

Checks: authenticated sending on 465 (implicit TLS; Mailu keeps 587/STARTTLS off), delivery to an IMAP inbox,
DKIM signing, wrong passwords rejected, no open relay on port 25, viruses rejected,
and (live) a valid certificate.
"""

import imaplib
import os
import smtplib
import ssl
import sys
import time
import uuid
from email.message import EmailMessage

DOMAIN = "alcomconsultants.co.ke"
HOST = os.environ.get("MAIL_TEST_HOST", f"mail.{DOMAIN}")
PASSWORD = os.environ.get("MAIL_TEST_PASSWORD", "")
# Separate passwords per mailbox (as setup.sh creates them); default: MAIL_TEST_PASSWORD.
PASSWORDS = {
    f"info@{DOMAIN}": os.environ.get("MAIL_TEST_INFO_PASSWORD", PASSWORD),
    f"noreply@{DOMAIN}": os.environ.get("MAIL_TEST_NOREPLY_PASSWORD", PASSWORD),
}
SMTP, SMTPS, IMAPS = map(int, os.environ.get("MAIL_TEST_PORTS", "25,465,993").split(","))
EXTERNAL_TO = os.environ.get("MAIL_TEST_EXTERNAL_TO")
EICAR = r"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

if os.environ.get("MAIL_TEST_INSECURE"):  # local self-signed certificate
    TLS = ssl._create_unverified_context()
else:
    TLS = ssl.create_default_context()

failures = 0


def check(name, fn):
    global failures
    try:
        detail = fn()
        print(f"PASS  {name}{f' ({detail})' if detail else ''}")
    except Exception as exc:  # noqa: BLE001 - report every failure and carry on
        failures += 1
        print(f"FAIL  {name}: {exc!r}")


def message(sender, to, subject, body="Test message from test_mail.py"):
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = sender, to, subject
    msg.set_content(body)
    return msg


def submit(msg, user, password=None):
    with smtplib.SMTP_SSL(HOST, SMTPS, context=TLS, timeout=30) as s:
        s.login(user, password or PASSWORDS[user])
        s.send_message(msg)


def wait_for(user, subject, timeout=90):
    """Return the raw message with this subject from the user's inbox (polls IMAP)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        with imaplib.IMAP4_SSL(HOST, IMAPS, ssl_context=TLS) as imap:
            imap.login(user, PASSWORDS[user])
            imap.select("INBOX")
            _, ids = imap.search(None, "SUBJECT", f'"{subject}"')
            if ids[0]:
                _, data = imap.fetch(ids[0].split()[-1], "(RFC822)")
                return data[0][1].decode(errors="replace")
        time.sleep(3)
    raise TimeoutError(f"{subject!r} did not reach {user}")


def delivery():
    subject = f"test {uuid.uuid4().hex[:8]}"
    submit(message(f"info@{DOMAIN}", f"noreply@{DOMAIN}", subject), f"info@{DOMAIN}")
    raw = wait_for(f"noreply@{DOMAIN}", subject)
    assert "DKIM-Signature:" in raw and f"d={DOMAIN}" in raw, "message is not DKIM-signed"
    return "delivered, DKIM-signed"


def wrong_password():
    try:
        submit(message(f"info@{DOMAIN}", f"noreply@{DOMAIN}", "x"), f"info@{DOMAIN}",
               password="definitely-wrong")
    except smtplib.SMTPAuthenticationError:
        return "rejected"
    raise AssertionError("login succeeded with a wrong password")


def no_open_relay():
    with smtplib.SMTP(HOST, SMTP, timeout=30) as s:
        s.ehlo("relay-test.example.net")
        s.mail("someone@example.net")
        code, reply = s.rcpt("victim@example.org")
    assert code >= 500, f"unauthenticated relay accepted: {code} {reply!r}"
    return f"{code}"


def virus_rejected():
    msg = message(f"info@{DOMAIN}", f"noreply@{DOMAIN}", "eicar test")
    msg.add_attachment(EICAR.encode(), maintype="application", subtype="octet-stream",
                       filename="eicar.com")
    try:
        submit(msg, f"info@{DOMAIN}")
    except smtplib.SMTPDataError as exc:
        return f"{exc.smtp_code}"
    raise AssertionError("message with a virus was accepted")


def certificate():
    with smtplib.SMTP_SSL(HOST, SMTPS, context=ssl.create_default_context(), timeout=30) as s:
        cert = s.sock.getpeercert()
    return f"valid until {cert['notAfter']}"


def external():
    subject = f"Alcom mail server test {uuid.uuid4().hex[:8]}"
    submit(message(f"Alcom Consultants <noreply@{DOMAIN}>", EXTERNAL_TO, subject,
                   "If you can read this, outgoing mail works. Check SPF/DKIM/DMARC = PASS "
                   "under 'Show original'."), f"noreply@{DOMAIN}")
    return f"sent {subject!r} to {EXTERNAL_TO}"


print(f"Mail server: {HOST}")
check("send on 465 + IMAP delivery on 993", delivery)
check("wrong password rejected", wrong_password)
if os.environ.get("MAIL_TEST_INSECURE") or os.environ.get("MAIL_TEST_SKIP_RELAY"):
    # Locally (and on the server itself), Docker forwards 127.0.0.1 through its gateway, an address Mailu trusts, so
    # this can't be judged here. The live run checks it from outside.
    print("SKIP  not an open relay (port 25): run this check from another machine")
else:
    check("not an open relay (port 25)", no_open_relay)
check("virus attachment rejected", virus_rejected)
if not os.environ.get("MAIL_TEST_INSECURE"):
    check("trusted TLS certificate", certificate)
if EXTERNAL_TO:
    check("external delivery", external)
sys.exit(1 if failures else 0)
