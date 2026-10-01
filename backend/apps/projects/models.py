from typing import Any

from django.contrib.gis.db import models

from apps.core.media import BaseMedia
from apps.core.models import BaseModel
from apps.core.text import unique_slug
from apps.locations.models import Area, Neighbourhood


class ProjectStatus(models.TextChoices):
    OFF_PLAN = "off_plan", "Off-plan"
    UNDER_CONSTRUCTION = "under_construction", "Under construction"
    COMPLETED = "completed", "Completed"


class Project(BaseModel):
    """A development (e.g. an apartment block) sold or let as several unit types."""

    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    developer = models.CharField(max_length=150, blank=True)
    summary = models.CharField(max_length=300)
    description = models.TextField()
    status = models.CharField(
        max_length=20, choices=ProjectStatus.choices, default=ProjectStatus.OFF_PLAN
    )
    completion_date = models.DateField(null=True, blank=True)
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="projects")
    neighbourhood = models.ForeignKey(
        Neighbourhood, on_delete=models.PROTECT, null=True, blank=True, related_name="projects"
    )
    location = models.PointField(null=True, blank=True, srid=4326)
    video_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.slug:
            self.slug = unique_slug(self, self.name, max_length=150)
        super().save(*args, **kwargs)


class UnitType(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="unit_types")
    name = models.CharField(max_length=100, help_text="e.g. 2 Bedroom Apartment")
    bedrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    size_sqm_min = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    size_sqm_max = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    price_from = models.PositiveBigIntegerField(null=True, blank=True, help_text="KES")
    price_to = models.PositiveBigIntegerField(null=True, blank=True, help_text="KES")
    units_available = models.PositiveSmallIntegerField(null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "bedrooms", "id"]

    def __str__(self) -> str:
        return f"{self.project.name}: {self.name}"


class ProjectUpdate(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="updates")
    date = models.DateField()
    title = models.CharField(max_length=150)
    body = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self) -> str:
        return self.title


class ProjectMedia(BaseMedia):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="media")

    class Meta(BaseMedia.Meta):
        verbose_name = "photo / file"
        verbose_name_plural = "photos & files"
