"""Spam protection for enquiry forms.

- Cloudflare Turnstile (when TURNSTILE_SECRET_KEY is set) proves a person sent the form.
- A signed form token rejects submissions made faster than a person could type, and
  replays older than a day.
- A hidden "website" field (honeypot) catches simple bots; they get a normal-looking reply.
- Rate limits (per IP) and a link limit live in the view and serializer.
"""

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from enum import StrEnum

from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

SIGNING_SALT = "enquiry-form"
MIN_SECONDS = 3
MAX_AGE = 24 * 60 * 60
VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def form_token() -> str:
    """Issued when a form is shown; checked when it's sent."""
    return signing.dumps(time.time(), salt=SIGNING_SALT)


def token_problem(token: str) -> str | None:
    """Why the form token is unacceptable, or None."""
    try:
        issued = float(signing.loads(token, salt=SIGNING_SALT, max_age=MAX_AGE))
    except signing.SignatureExpired:
        return "expired"
    except signing.BadSignature, TypeError, ValueError:
        return "invalid"
    age = time.time() - issued
    if age > MAX_AGE:
        return "expired"
    if age < MIN_SECONDS:
        return "too fast"
    return None


class Check(StrEnum):
    PASSED = "passed"
    FAILED = "failed"
    UNVERIFIED = "unverified"  # Cloudflare unreachable: accepted, so no lead is lost
    OFF = "off"  # Turnstile not configured


def turnstile_enabled() -> bool:
    return bool(settings.TURNSTILE_SITE_KEY and settings.TURNSTILE_SECRET_KEY)


def verify_turnstile(response: str, remote_ip: str | None) -> Check:
    if not turnstile_enabled():
        return Check.OFF
    if not response:
        return Check.FAILED
    data = {"secret": settings.TURNSTILE_SECRET_KEY, "response": response}
    if remote_ip:
        data["remoteip"] = remote_ip
    request = urllib.request.Request(
        VERIFY_URL, data=urllib.parse.urlencode(data).encode(), method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as reply:  # noqa: S310
            result = json.load(reply)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("Turnstile unreachable, accepting enquiry unverified: %s", exc)
        return Check.UNVERIFIED
    if result.get("success"):
        return Check.PASSED
    logger.info("Turnstile rejected an enquiry: %s", result.get("error-codes"))
    return Check.FAILED
