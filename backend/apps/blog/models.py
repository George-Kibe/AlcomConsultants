from typing import Any, ClassVar

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.media import delivery_url
from apps.core.models import BaseModel, TimeStampedModel
from apps.core.text import unique_slug

from . import html


class PostStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"


class PostQuerySet(models.QuerySet["Post"]):
    def published(self) -> PostQuerySet:
        return self.filter(status=PostStatus.PUBLISHED, published_at__lte=timezone.now())


class Post(BaseModel):
    """A blog article: one cover image and a rich-text body (sanitised HTML)."""

    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    excerpt = models.CharField(
        max_length=300, blank=True, help_text="Summary for cards and search results."
    )
    body = models.TextField(blank=True)
    cover_public_id = models.CharField(max_length=255, blank=True)
    cover_alt = models.CharField(max_length=200, blank=True)
    cover_width = models.PositiveIntegerField(null=True, blank=True)
    cover_height = models.PositiveIntegerField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=PostStatus.choices, default=PostStatus.DRAFT, db_index=True
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=160, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        editable=False,
    )

    objects: ClassVar[PostQuerySet] = PostQuerySet.as_manager()  # type: ignore[assignment]

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["status", "-published_at"])]

    def __str__(self) -> str:
        return self.title

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.body = html.clean(self.body)
        if not self.slug:
            self.slug = unique_slug(self, self.title, max_length=120)
        if self.status == PostStatus.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_published(self) -> bool:
        return (
            self.status == PostStatus.PUBLISHED
            and self.published_at is not None
            and self.published_at <= timezone.now()
        )

    @property
    def summary(self) -> str:
        return self.excerpt or html.excerpt(self.body)

    @property
    def reading_minutes(self) -> int:
        return html.reading_minutes(self.body)

    @property
    def cover_url(self) -> str:
        return delivery_url(self.cover_public_id) if self.cover_public_id else ""

    @property
    def author_name(self) -> str:
        if self.author and (name := self.author.get_full_name().strip()):
            return name
        return "Alcom Consultants"


class Comment(TimeStampedModel):
    """A signed-in reader's comment on a post. Published at once; staff can hide it."""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    # Kept when the reader deletes their account; shown as "Former reader".
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="blog_comments",
    )
    body = models.TextField(max_length=2000)
    is_hidden = models.BooleanField(default=False, db_index=True)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        editable=False,
    )
    hidden_at = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["post", "is_hidden", "created_at"])]

    def __str__(self) -> str:
        return f"{self.author or 'Former reader'} on {self.post}"

    @property
    def author_name(self) -> str:
        """First name and last initial (e.g. "Jane W."), never the email address."""
        user = self.author
        if user is None:
            return "Former reader"
        if user.is_staff:
            return f"{user.first_name or 'Alcom'} (Alcom Consultants)"
        last = f" {user.last_name[0]}." if user.last_name else ""
        return f"{user.first_name}{last}".strip() or "Reader"

    def hide(self, by: Any) -> None:
        self.is_hidden, self.hidden_by, self.hidden_at = True, by, timezone.now()

    def unhide(self) -> None:
        self.is_hidden, self.hidden_by, self.hidden_at = False, None, None
