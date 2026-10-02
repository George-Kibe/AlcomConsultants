from datetime import date
from typing import Any

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel
from apps.listings.models import Property

#: Shown next to the consent checkbox and stored with every enquiry (bump the version
#: whenever the wording changes, so each enquiry records what the person agreed to).
CONSENT_VERSION = "2026-10-02"
CONSENT_TEXT = (
    "I agree that Alcom Consultants may use these details to respond to my enquiry, "
    "as described in the Privacy Policy."
)
REFERENCE_START = 1000


class Kind(models.TextChoices):
    LISTING = "listing", "Property enquiry"
    CONTACT = "contact", "General enquiry"
    VALUATION = "valuation", "Valuation request"
    MANAGEMENT = "management", "Property management"
    ASSETS = "assets", "Asset management"
    SURVEY = "survey", "Land survey"


class Stage(models.TextChoices):
    NEW = "new", "New"
    CONTACTED = "contacted", "Contacted"
    VIEWING = "viewing", "Viewing"
    NEGOTIATING = "negotiating", "Negotiating"
    WON = "won", "Won"
    LOST = "lost", "Lost"


OPEN_STAGES = [Stage.NEW, Stage.CONTACTED, Stage.VIEWING, Stage.NEGOTIATING]
CLOSED_STAGES = [Stage.WON, Stage.LOST]


class Purpose(models.TextChoices):
    """Why a valuation is needed."""

    MORTGAGE = "mortgage", "Mortgage or bank loan"
    SALE = "sale", "Selling"
    PURCHASE = "purchase", "Buying"
    INSURANCE = "insurance", "Insurance"
    PROBATE = "probate", "Probate or succession"
    OTHER = "other", "Other"


class EnquiryQuerySet(models.QuerySet["Enquiry"]):
    def leads(self) -> EnquiryQuerySet:
        """Everything except spam."""
        return self.filter(is_spam=False)

    def open(self) -> EnquiryQuerySet:
        return self.leads().filter(stage__in=OPEN_STAGES)

    def due(self, on: date | None = None) -> EnquiryQuerySet:
        """Open leads whose follow-up date has come (today or earlier)."""
        return self.open().filter(follow_up_on__lte=on or timezone.localdate())


class Enquiry(BaseModel):
    """A message from the website, and the lead it becomes in the dashboard."""

    reference = models.CharField(  # noqa: DJ001 (NULL until assigned; unique)
        max_length=20, unique=True, null=True, editable=False
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    message = models.TextField(max_length=3000, blank=True)

    # What it's about.
    property = models.ForeignKey(
        Property, on_delete=models.SET_NULL, null=True, blank=True, related_name="enquiries"
    )
    property_label = models.CharField(
        max_length=200, blank=True, help_text="Reference and title when sent (kept if deleted)."
    )
    property_type = models.CharField(max_length=60, blank=True)
    location = models.CharField(max_length=150, blank=True)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, blank=True)
    units = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Units to manage")

    # Where it came from and what the person agreed to.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enquiries",
        help_text="The visitor's account, if they were signed in.",
    )
    source_path = models.CharField(max_length=300, blank=True)
    consent_at = models.DateTimeField()
    consent_version = models.CharField(max_length=20, default=CONSENT_VERSION)
    spam_check = models.CharField(
        max_length=20,
        blank=True,
        help_text="Turnstile result: passed, unverified (Cloudflare unreachable) or off.",
    )

    # The lead.
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.NEW, db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_enquiries",
        limit_choices_to={"is_staff": True},
    )
    follow_up_on = models.DateField(null=True, blank=True, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    is_spam = models.BooleanField(default=False, db_index=True)

    objects = EnquiryQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "enquiries"
        indexes = [models.Index(fields=["is_spam", "stage", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.reference or 'New'} — {self.name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if self.stage in CLOSED_STAGES and self.closed_at is None:
            self.closed_at = timezone.now()
        elif self.stage in OPEN_STAGES:
            self.closed_at = None
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating and not self.reference:
            self.reference = f"E-{REFERENCE_START + self.pk}"
            super().save(update_fields=["reference"])

    def is_open(self) -> bool:  # a method: `property` is a field name on this model
        return not self.is_spam and self.stage in OPEN_STAGES


class Note(TimeStampedModel):
    """The lead's timeline: staff notes, and automatic entries for changes."""

    enquiry = models.ForeignKey(Enquiry, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    body = models.TextField(max_length=5000)
    is_system = models.BooleanField(default=False, help_text="Recorded automatically.")

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return self.body[:60]
