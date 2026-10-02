"""Demo data (seed_demo_listings): kept out of search engines and location pages."""

from django.db.models import Q

#: Owner of every demo listing and article.
DEMO_EMAIL = "demo-data@alcom.invalid"


def demo_q(prefix: str = "") -> Q:
    """Matches demo rows, e.g. Property.objects.exclude(demo_q())."""
    return Q(**{f"{prefix}created_by__email": DEMO_EMAIL})


def is_demo(obj: object) -> bool:
    creator = getattr(obj, "created_by", None)
    return bool(creator and creator.email == DEMO_EMAIL)
