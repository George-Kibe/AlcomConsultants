"""Branded HTML + plain-text emails (templates under templates/email/)."""

import email.policy
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


class BrandedEmail(EmailMultiAlternatives):
    """Keeps long headers (List-Unsubscribe URLs) on one line: Python folds header words
    longer than 78 characters into RFC 2047 encoded-words, which mail providers don't
    recognise as URLs. The body is encoded first, with normal line lengths; only header
    output allows RFC 5322's 998."""

    def message(self, *, policy: Any = email.policy.default) -> Any:
        msg = super().message(policy=policy)
        msg.policy = msg.policy.clone(max_line_length=998)
        return msg


def send_branded(
    *,
    subject: str,
    template: str,
    context: dict[str, Any],
    to: list[str],
    reply_to: list[str] | None = None,
    headers: dict[str, str] | None = None,
) -> None:
    """Render `<template>.txt` and `<template>.html` and send them as one email."""
    ctx = {"site_url": settings.SITE_URL, **context}
    message = BrandedEmail(
        subject=f"{settings.ACCOUNT_EMAIL_SUBJECT_PREFIX}{subject}",
        body=render_to_string(f"{template}.txt", ctx),
        to=to,
        reply_to=reply_to,
        headers=headers,
    )
    message.attach_alternative(render_to_string(f"{template}.html", ctx), "text/html")
    message.send()
