"""Cloudinary integration: configuration, uploads and delivery URLs."""

import os
import time
from typing import IO, Any

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.db import models


def configure() -> None:
    """Point the SDK at CLOUDINARY_URL (cloudinary://key:secret@cloud-name)."""
    if settings.CLOUDINARY_URL:
        os.environ["CLOUDINARY_URL"] = settings.CLOUDINARY_URL
        cloudinary.reset_config()
        cloudinary.config(secure=True)


def upload(file: IO[bytes] | str, *, folder: str, resource_type: str = "auto") -> dict[str, Any]:
    """Upload a file to Cloudinary under the environment's folder and return its metadata."""
    result: dict[str, Any] = cloudinary.uploader.upload(
        file,
        folder=f"{settings.CLOUDINARY_FOLDER}/{folder}",
        resource_type=resource_type,
        unique_filename=True,
        overwrite=False,
    )
    return result


ALLOWED_UPLOAD_FORMATS = "jpg,jpeg,png,webp,avif,heic"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


def signed_upload_params(folder: str) -> dict[str, Any]:
    """Parameters the browser sends with a direct upload to Cloudinary (signed, so they
    can't be altered: only images, only into this folder)."""
    config = cloudinary.config()
    params: dict[str, Any] = {
        "folder": f"{settings.CLOUDINARY_FOLDER}/{folder}",
        "timestamp": int(time.time()),
        "allowed_formats": ALLOWED_UPLOAD_FORMATS,
    }
    params["signature"] = cloudinary.utils.api_sign_request(params, config.api_secret)
    return {
        **params,
        "api_key": config.api_key,
        "cloud_name": config.cloud_name,
        "upload_url": f"https://api.cloudinary.com/v1_1/{config.cloud_name}/image/upload",
        "max_bytes": MAX_UPLOAD_BYTES,
    }


def is_authentic_upload(public_id: str, version: int | str, signature: str) -> bool:
    """True if Cloudinary really returned this upload result (signed with our API secret)."""
    return bool(cloudinary.utils.verify_api_response_signature(public_id, version, signature))


def delivery_url(public_id: str, *, resource_type: str = "image", **transformation: Any) -> str:
    """HTTPS delivery URL; images default to automatic format and quality."""
    if resource_type == "image":
        transformation.setdefault("fetch_format", "auto")
        transformation.setdefault("quality", "auto")
    url, _ = cloudinary.utils.cloudinary_url(
        public_id, resource_type=resource_type, secure=True, **transformation
    )
    return str(url)


class MediaKind(models.TextChoices):
    IMAGE = "image", "Photo"
    FLOOR_PLAN = "floor_plan", "Floor plan"
    VIDEO = "video", "Video"


class BaseMedia(models.Model):
    """A Cloudinary asset attached to something (a property, a project…)."""

    kind = models.CharField(max_length=20, choices=MediaKind.choices, default=MediaKind.IMAGE)
    public_id = models.CharField(max_length=255, help_text="Cloudinary public ID")
    resource_type = models.CharField(max_length=10, default="image")
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    bytes = models.PositiveBigIntegerField(null=True, blank=True)
    format = models.CharField(max_length=10, blank=True)
    alt_text = models.CharField(
        max_length=200, blank=True, help_text="Describe the photo for screen readers and SEO."
    )
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.public_id

    @property
    def url(self) -> str:
        return delivery_url(self.public_id, resource_type=self.resource_type)

    def apply_upload_result(self, result: dict[str, Any]) -> None:
        self.public_id = result["public_id"]
        self.resource_type = result.get("resource_type", "image")
        self.width = result.get("width")
        self.height = result.get("height")
        self.bytes = result.get("bytes")
        self.format = result.get("format", "")
