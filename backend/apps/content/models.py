"""Company content staff edit in the dashboard: team, testimonials, FAQs and job openings."""

from typing import Any

from django.db import models
from django.utils import timezone

from apps.blog import html
from apps.core.media import delivery_url
from apps.core.models import BaseModel
from apps.core.text import unique_slug


class Orderable(BaseModel):
    """Shown in `order` (set by dragging in the dashboard); hidden items stay as drafts."""

    order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField("shown on the website", default=True)

    class Meta:
        abstract = True
        ordering = ["order", "created_at"]


class TeamMember(Orderable):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=120, help_text='e.g. "Registered Valuer"')
    bio = models.TextField(max_length=1000, blank=True)
    photo_public_id = models.CharField(max_length=255, blank=True)
    photo_width = models.PositiveIntegerField(null=True, blank=True)
    photo_height = models.PositiveIntegerField(null=True, blank=True)
    email = models.EmailField(blank=True, help_text="Shown publicly if set.")
    linkedin_url = models.URLField(blank=True)

    class Meta(Orderable.Meta):
        verbose_name = "team member"

    def __str__(self) -> str:
        return self.name

    @property
    def photo_url(self) -> str:
        return delivery_url(self.photo_public_id) if self.photo_public_id else ""


class Testimonial(Orderable):
    quote = models.TextField(max_length=800)
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=150, blank=True, help_text='e.g. "Landlord, Kilimani"')
    rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1 to 5 stars")

    def __str__(self) -> str:
        return f"{self.name}: {self.quote[:40]}"


class FaqCategory(models.TextChoices):
    GENERAL = "general", "General"
    BUYING = "buying", "Buying and renting"
    SELLING = "selling", "Selling and letting"
    MANAGEMENT = "management", "Property management"
    VALUATION = "valuation", "Valuations"
    ASSETS = "assets", "Asset management"
    SURVEY = "survey", "Land surveys"


class Faq(Orderable):
    question = models.CharField(max_length=200)
    answer = models.TextField(max_length=2000)
    category = models.CharField(
        max_length=20, choices=FaqCategory.choices, default=FaqCategory.GENERAL, db_index=True
    )

    class Meta(Orderable.Meta):
        verbose_name = "FAQ"

    def __str__(self) -> str:
        return self.question


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full time"
    PART_TIME = "part_time", "Part time"
    CONTRACT = "contract", "Contract"
    INTERNSHIP = "internship", "Internship or attachment"


class JobOpeningQuerySet(models.QuerySet["JobOpening"]):
    def visible(self) -> JobOpeningQuerySet:
        return self.filter(is_published=True)

    def open(self) -> JobOpeningQuerySet:
        today = timezone.localdate()
        return self.visible().filter(
            models.Q(closing_date__isnull=True) | models.Q(closing_date__gte=today)
        )


class JobOpening(BaseModel):
    """A vacancy on /careers. People apply by email (no CVs are stored on the website)."""

    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    location = models.CharField(max_length=100, default="Westlands, Nairobi")
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    summary = models.CharField(max_length=300)
    description = models.TextField(blank=True, help_text="Rich text, sanitised on save.")
    apply_email = models.EmailField(default="info@alcomconsultants.co.ke")
    closing_date = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    objects = JobOpeningQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "job opening"

    def __str__(self) -> str:
        return self.title

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.description = html.clean(self.description)
        if not self.slug:
            self.slug = unique_slug(self, self.title, max_length=120)
        if self.is_published and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_open(self) -> bool:
        return self.closing_date is None or self.closing_date >= timezone.localdate()
