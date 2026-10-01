from typing import Any

from django.db import transaction
from django.db.models.signals import post_delete

from .media import BaseMedia
from .tasks import delete_cloudinary_asset


def remove_from_cloudinary(sender: type[BaseMedia], instance: BaseMedia, **kwargs: Any) -> None:
    public_id, resource_type = instance.public_id, instance.resource_type
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
