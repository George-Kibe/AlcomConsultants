from django.conf import settings
from django.db import models
from django.http import QueryDict
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel
from apps.listings.models import Property

#: Per visitor, so alert digests stay readable and nobody stores thousands of rows.
MAX_SAVED_SEARCHES = 20
MAX_FAVOURITES = 200


class Favourite(TimeStampedModel):
    """A property a visitor has saved."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favourites"
    )
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="favourited_by")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "property"], name="unique_favourite"),
        ]

    def __str__(self) -> str:
        return f"{self.user} ♥ {self.property}"


class SavedSearch(BaseModel):
    """A visitor's property search; new matches are emailed in a daily digest."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_searches"
    )
    name = models.CharField(max_length=120)
    query = models.CharField(
        max_length=1000, help_text="Normalised /properties query string (search filters only)."
    )
    alerts = models.BooleanField("daily email", default=True)
    last_alerted_at = models.DateTimeField(
        default=timezone.now, help_text="Listings published after this are new to the visitor."
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "saved searches"
        constraints = [
            models.UniqueConstraint(fields=["user", "query"], name="unique_saved_search"),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def filters(self) -> QueryDict:
        return QueryDict(self.query)

    @property
    def path(self) -> str:
        return f"/properties?{self.query}" if self.query else "/properties"
