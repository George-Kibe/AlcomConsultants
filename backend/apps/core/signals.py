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
    return public_id.startswith((f"{prefix}/properties/", f"{prefix}/projects/", f"{prefix}/blog/"))


def schedule_cloudinary_delete(public_id: str, resource_type: str = "image") -> None:
    """Delete an uploaded asset from Cloudinary once the current transaction commits."""
    if is_uploaded_asset(public_id):
        transaction.on_commit(lambda: delete_cloudinary_asset.delay(public_id, resource_type))


def remove_from_cloudinary(sender: type[BaseMedia], instance: BaseMedia, **kwargs: Any) -> None:
    schedule_cloudinary_delete(instance.public_id, instance.resource_type)


def remove_post_cover(sender: type[Any], instance: Any, **kwargs: Any) -> None:
    if instance.cover_public_id:
        schedule_cloudinary_delete(instance.cover_public_id)


def connect() -> None:
    from apps.blog.models import Post
    from apps.listings.models import PropertyMedia
    from apps.projects.models import ProjectMedia

    for model in (PropertyMedia, ProjectMedia):
        post_delete.connect(
            remove_from_cloudinary,
            sender=model,
            dispatch_uid=f"cloudinary-cleanup-{model.__name__}",
        )
    post_delete.connect(remove_post_cover, sender=Post, dispatch_uid="cloudinary-cleanup-Post")
