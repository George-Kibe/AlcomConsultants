import logging

import cloudinary.uploader
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def delete_cloudinary_asset(self, public_id: str, resource_type: str = "image") -> None:  # type: ignore[no-untyped-def]
    """Remove a deleted photo from Cloudinary (retried if Cloudinary is unreachable)."""
    try:
        result = cloudinary.uploader.destroy(
            public_id, resource_type=resource_type, invalidate=True
        )
    except Exception as exc:
        raise self.retry(exc=exc) from exc
    logger.info("Cloudinary destroy %s: %s", public_id, result.get("result"))
