from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete

from .media import BaseMedia
from .tasks import delete_cloudinary_asset


def is_uploaded_asset(public_id: str) -> bool:
    """Only staff uploads may be deleted; shared site imagery (e.g. demo listings that reuse
    the hero photos) must never be removed from Cloudinary."""
    prefix = settings.CLOUDINARY_FOLDER
    return public_id.startswith((f"{prefix}/properties/", f"{prefix}/projects/"))


def remove_from_cloudinary(sender: type[BaseMedia], instance: BaseMedia, **kwargs: Any) -> None:
    public_id, resource_type = instance.public_id, instance.resource_type
    if is_uploaded_asset(public_id):
        transaction.on_commit(lambda: delete_cloudinary_asset.delay(public_id, resource_type))


def connect() -> None:
    from apps.listings.models import PropertyMedia
    from apps.projects.models import ProjectMedia

    for model in (PropertyMedia, ProjectMedia):
        post_delete.connect(
            remove_from_cloudinary,
            sender=model,
            dispatch_uid=f"cloudinary-cleanup-{model.__name__}",
        )
