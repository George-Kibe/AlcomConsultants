from typing import Any, ClassVar

from django.conf import settings
from django.contrib.gis.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.text import slugify

from apps.core.media import BaseMedia
from apps.core.models import BaseModel
from apps.locations.models import Area, Neighbourhood


class PropertyCategory(models.TextChoices):
    RESIDENTIAL = "residential", "Residential"
    COMMERCIAL = "commercial", "Commercial"
    LAND = "land", "Land"


class PropertyType(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=20, choices=PropertyCategory.choices)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name


class Amenity(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(unique=True)
    group = models.CharField(max_length=40, blank=True, help_text="e.g. Security, Utilities")
    icon = models.CharField(max_length=40, blank=True, help_text="Lucide icon name")

    class Meta:
        ordering = ["group", "name"]
        verbose_name_plural = "amenities"

    def __str__(self) -> str:
        return self.name


class DealType(models.TextChoices):
    SALE = "sale", "For Sale"
    RENT = "rent", "For Rent"
    LEASE = "lease", "Commercial Lease"


REFERENCE_LETTER = {DealType.SALE: "S", DealType.RENT: "R", DealType.LEASE: "L"}
REFERENCE_START = 1000


class Status(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    UNDER_OFFER = "under_offer", "Under offer"
    SOLD = "sold", "Sold"
    LET = "let", "Let"
    ARCHIVED = "archived", "Archived"


#: Shown in search results.
LISTED_STATUSES = [Status.PUBLISHED, Status.UNDER_OFFER]
#: Detail page reachable (sold/let pages stay up for SEO and reference).
VISIBLE_STATUSES = [*LISTED_STATUSES, Status.SOLD, Status.LET]


class PriceUnit(models.TextChoices):
    TOTAL = "total", "Total"
    PER_MONTH = "per_month", "per month"
    PER_SQM = "per_sqm", "per m²"
    PER_SQFT = "per_sqft", "per ft²"
    PER_ACRE = "per_acre", "per acre"


class Furnishing(models.TextChoices):
    UNFURNISHED = "unfurnished", "Unfurnished"
    SEMI = "semi", "Semi-furnished"
    FURNISHED = "furnished", "Furnished"


class LandUnit(models.TextChoices):
    ACRES = "acres", "acres"
    HECTARES = "hectares", "hectares"
    SQM = "sqm", "m²"


class PropertyQuerySet(models.QuerySet["Property"]):
    def listed(self) -> PropertyQuerySet:
        return self.filter(status__in=LISTED_STATUSES)

    def visible(self) -> PropertyQuerySet:
        return self.filter(status__in=VISIBLE_STATUSES)


class Property(BaseModel):
    reference = models.CharField(max_length=20, unique=True, null=True, editable=False)
    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True, editable=False)
    description = models.TextField()
    deal_type = models.CharField(max_length=10, choices=DealType.choices)
    property_type = models.ForeignKey(PropertyType, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )

    price = models.PositiveBigIntegerField(null=True, blank=True, help_text="KES")
    price_unit = models.CharField(max_length=10, choices=PriceUnit.choices, default=PriceUnit.TOTAL)
    price_on_request = models.BooleanField(default=False)

    bedrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    bathrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    parking_spaces = models.PositiveSmallIntegerField(null=True, blank=True)
    built_area_sqm = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    land_area = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    land_area_unit = models.CharField(
        max_length=10, choices=LandUnit.choices, default=LandUnit.ACRES
    )
    furnishing = models.CharField(max_length=20, choices=Furnishing.choices, blank=True)
    amenities = models.ManyToManyField(Amenity, blank=True, related_name="properties")

    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="properties")
    neighbourhood = models.ForeignKey(
        Neighbourhood, on_delete=models.PROTECT, null=True, blank=True, related_name="properties"
    )
    location = models.PointField(null=True, blank=True, srid=4326)
    show_exact_location = models.BooleanField(
        default=False, help_text="Otherwise the public map shows an approximate position."
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="properties",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listings",
        help_text="Staff contact shown on the listing",
    )
    video_url = models.URLField(blank=True, help_text="YouTube or Vimeo link")
    is_featured = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

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

    objects: ClassVar[PropertyQuerySet] = PropertyQuerySet.as_manager()  # type: ignore[assignment]

    class Meta:
        verbose_name_plural = "properties"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "deal_type", "-published_at"]),
            models.Index(fields=["status", "price"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price_on_request=True) | models.Q(price__isnull=False),
                name="price_required_unless_on_request",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.reference or 'New'} — {self.title}"

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if (
            self.neighbourhood is not None
            and self.area_id
            and self.neighbourhood.area_id != self.area_id
        ):
            errors["neighbourhood"] = "This neighbourhood is not in the selected area."
        if self.price is None and not self.price_on_request:
            errors["price"] = "Enter a price, or tick 'price on request'."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: Any, **kwargs: Any) -> None:
        if self.status in LISTED_STATUSES and self.published_at is None:
            self.published_at = timezone.now()
        creating = self.pk is None
        if creating and not self.slug:
            self.slug = f"tmp-{self.uuid}"
        super().save(*args, **kwargs)
        if creating and not self.reference:
            # Running number from the primary key, e.g. ALC-S-1001. Stable once assigned.
            letter = REFERENCE_LETTER[DealType(self.deal_type)]
            self.reference = f"ALC-{letter}-{REFERENCE_START + self.pk}"
            self.slug = f"{slugify(self.title)[:150].strip('-')}-{self.reference.lower()}"
            super().save(update_fields=["reference", "slug"])

    @property
    def price_label(self) -> str:
        """ "KES 180,000 / month" or "Price on request" (as on the website)."""
        if self.price_on_request or self.price is None:
            return "Price on request"
        suffix = {
            PriceUnit.PER_MONTH: " / month",
            PriceUnit.PER_SQM: " / m²",
            PriceUnit.PER_SQFT: " / ft²",
            PriceUnit.PER_ACRE: " / acre",
        }.get(PriceUnit(self.price_unit), "")
        return f"KES {self.price:,}{suffix}"

    @property
    def is_listed(self) -> bool:
        return self.status in LISTED_STATUSES

    @property
    def public_location(self) -> tuple[float, float] | None:
        """(lat, lng) for public maps; rounded to ~1 km unless the exact spot may be shown."""
        point = self.location or self.area.location
        if point is None:
            return None
        lat, lng = point.y, point.x
        if not (self.show_exact_location and self.location):
            lat, lng = round(lat, 2), round(lng, 2)
        return lat, lng


class PropertyMedia(BaseMedia):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="media")

    class Meta(BaseMedia.Meta):
        verbose_name = "photo / file"
        verbose_name_plural = "photos & files"
        indexes = [models.Index(fields=["property", "kind", "order"])]
