"""Kenya's location hierarchy: County → Area (town / estate) → Neighbourhood."""

from django.contrib.gis.db import models


class County(models.Model):
    code = models.PositiveSmallIntegerField(unique=True, help_text="Official county code (1-47)")
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "counties"

    def __str__(self) -> str:
        return self.name


class Area(models.Model):
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="areas")
    name = models.CharField(max_length=100)
    slug = models.SlugField()
    location = models.PointField(
        null=True, blank=True, srid=4326, help_text="Approximate centre, used to centre maps"
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["county", "slug"], name="unique_area_slug_per_county")
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.county.name}"


class Neighbourhood(models.Model):
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="neighbourhoods")
    name = models.CharField(max_length=100)
    slug = models.SlugField()
    location = models.PointField(null=True, blank=True, srid=4326)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["area", "slug"], name="unique_neighbourhood_slug_per_area"
            )
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.area.name}"
