from django.db.models import Model
from django.utils.text import slugify


def unique_slug(instance: Model, value: str, *, field: str = "slug", max_length: int = 80) -> str:
    """Slugify `value` and add -2, -3… until no other row of the same model uses it."""
    base = slugify(value)[:max_length].strip("-") or "item"
    manager = type(instance)._default_manager
    others = manager.exclude(pk=instance.pk) if instance.pk else manager.all()
    slug, n = base, 2
    while others.filter(**{field: slug}).exists():
        suffix = f"-{n}"
        slug = f"{base[: max_length - len(suffix)]}{suffix}"
        n += 1
    return slug
