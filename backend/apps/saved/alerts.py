"""Daily saved-search digest: one email per visitor listing new matching properties."""

import email.policy
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from allauth.account.models import EmailAddress
from django.conf import settings
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.accounts.models import User
from apps.core.media import delivery_url
from apps.listings.models import Property

from . import search
from .models import SavedSearch

logger = logging.getLogger(__name__)

#: Properties shown per saved search in one email; the rest are behind "See all".
PER_SEARCH = 6
TOKEN_SALT = "saved-search-alerts"  # noqa: S105 (a signing salt, not a secret)


class DigestEmail(EmailMultiAlternatives):
    """Keeps List-Unsubscribe intact: Python folds header words longer than 78 characters
    into RFC 2047 encoded-words, which mail providers don't recognise as a URL. The body is
    encoded first (with normal line lengths); only header output allows RFC 5322's 998."""

    def message(self, *, policy: Any = email.policy.default) -> Any:
        msg = super().message(policy=policy)
        msg.policy = msg.policy.clone(max_line_length=998)
        return msg


@dataclass
class SearchDigest:
    search: SavedSearch
    total: int
    properties: list[Property] = field(default_factory=list)


def unsubscribe_token(user: User) -> str:
    """Signed, non-expiring token for the "stop these emails" link."""
    return signing.dumps(str(user.uuid), salt=TOKEN_SALT, compress=True)


def unsubscribe_user(token: str) -> User | None:
    """Turn off every saved-search alert for the token's owner; None if the token is bad."""
    try:
        uuid = signing.loads(token, salt=TOKEN_SALT)
    except signing.BadSignature:
        return None
    user = User.objects.filter(uuid=uuid).first()
    if user is not None:
        SavedSearch.objects.filter(user=user, alerts=True).update(alerts=False)
    return user


def recipients() -> list[int]:
    """Active visitors with a confirmed email and at least one alert switched on."""
    verified = EmailAddress.objects.filter(verified=True).values("user_id")
    return list(
        User.objects.filter(is_active=True, pk__in=verified, saved_searches__alerts=True)
        .distinct()
        .values_list("pk", flat=True)
    )


def build_digest(user: User, now: datetime) -> list[SearchDigest]:
    digests = []
    for saved in user.saved_searches.filter(alerts=True).order_by("created_at"):
        new = search.matches(saved.query, since=saved.last_alerted_at).filter(published_at__lte=now)
        total = new.count()
        if total:
            props = list(
                new.select_related("area__county", "property_type").prefetch_related("media")[
                    :PER_SEARCH
                ]
            )
            digests.append(SearchDigest(saved, total, props))
    return digests


def _card(prop: Property) -> dict[str, Any]:
    photo = next((m for m in prop.media.all() if m.kind == "image"), None)
    return {
        "title": prop.title,
        "url": f"{settings.SITE_URL}/properties/{prop.slug}",
        "price": prop.price_label,
        "place": ", ".join(filter(None, [prop.area.name, prop.area.county.name])),
        "photo": delivery_url(photo.public_id, width=560, height=372, crop="fill") if photo else "",
    }


def send_digest(user: User, now: datetime) -> int:
    """Email the user's new matches (if any) and mark their searches as alerted up to `now`.

    Returns the number of properties in the email.
    """
    digests = build_digest(user, now)
    count = sum(d.total for d in digests)
    if digests:
        site = settings.SITE_URL
        unsubscribe_url = f"{site}/account/unsubscribe?token={unsubscribe_token(user)}"
        one_click = f"{site}/api/v1/alerts/unsubscribe/?token={unsubscribe_token(user)}"
        context = {
            "user": user,
            "count": count,
            "searches": [
                {
                    "name": d.search.name,
                    "total": d.total,
                    "url": f"{site}{d.search.path}",
                    "more": d.total - len(d.properties),
                    "properties": [_card(p) for p in d.properties],
                }
                for d in digests
            ],
            "manage_url": f"{site}/account/saved-searches",
            "unsubscribe_url": unsubscribe_url,
            "site_url": site,
        }
        noun = "property matches" if count == 1 else "properties match"
        message = DigestEmail(
            subject=f"{settings.ACCOUNT_EMAIL_SUBJECT_PREFIX}{count} new {noun} your saved "
            f"search{'es' if len(digests) > 1 else ''}",
            body=render_to_string("saved/email/digest.txt", context),
            to=[user.email],
            headers={
                "List-Unsubscribe": f"<{one_click}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        )
        message.attach_alternative(
            render_to_string("saved/email/digest.html", context), "text/html"
        )
        message.send()
        logger.info("Saved-search digest to user %s: %s properties", user.pk, count)
    user.saved_searches.filter(alerts=True).update(last_alerted_at=now)
    return count
