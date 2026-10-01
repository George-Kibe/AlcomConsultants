"""Saved-search queries: normalising, describing and matching them against listings."""

from datetime import datetime
from urllib.parse import urlencode

from django.db.models import QuerySet
from django.http import QueryDict

from apps.listings.filters import PropertyFilter
from apps.listings.models import Amenity, Furnishing, Property, PropertyType
from apps.locations.models import Area, County

#: The search filters a saved search keeps (`where` is the location label the search page
#: shows). Sorting, paging, map view and map area are not part of "what I'm looking for".
KEYS = [
    "deal",
    "type",
    "county",
    "area",
    "neighbourhood",
    "where",
    "q",
    "min_price",
    "max_price",
    "min_beds",
    "min_baths",
    "furnishing",
    "amenities",
]
DEAL_PHRASE = {"sale": "for sale", "rent": "for rent", "lease": "to lease"}


class InvalidSearch(ValueError):
    pass


def normalise(raw: str) -> str:
    """Keep the search filters of a `/properties` query string, in a stable order."""
    params = QueryDict(raw.lstrip("?"))
    kept = [(k, params[k].strip()) for k in KEYS if params.get(k, "").strip()]
    query = urlencode(kept)
    filterset = PropertyFilter(data=QueryDict(query), queryset=Property.objects.none())
    if not filterset.is_valid():
        raise InvalidSearch("; ".join(f"{k}: {v[0]}" for k, v in filterset.errors.items()))
    return query


def matches(query: str, *, since: datetime | None = None) -> QuerySet[Property]:
    """Active listings matching a saved search, newest first; optionally only new ones."""
    qs = Property.objects.listed()
    if since is not None:
        qs = qs.filter(published_at__gt=since)
    filterset = PropertyFilter(data=QueryDict(query), queryset=qs)
    return filterset.qs.order_by("-published_at", "-id")


def _plural(name: str) -> str:
    """Same rule as the search page heading (frontend lib/listings.ts)."""
    lower = name.lower()
    if lower.endswith(("land", "space", "s")) or "/" in name:
        return name
    return f"{name}s"


def _price(value: str) -> str:
    return f"KES {int(value):,}"


def describe(query: str) -> str:
    """A readable name, e.g. "Apartments for rent in Kilimani · 2+ beds · up to KES 150,000"."""
    p = QueryDict(query)
    slugs = [s for s in p.get("type", "").split(",") if s]
    names = list(PropertyType.objects.filter(slug__in=slugs).values_list("name", flat=True))
    title = _plural(names[0]) if len(names) == 1 else "Properties"
    if deal := DEAL_PHRASE.get(p.get("deal", "")):
        title += f" {deal}"
    if where := p.get("where", "").split(",")[0].strip():
        title += f" in {where}"
    elif areas := list(
        Area.objects.filter(slug__in=p.get("area", "").split(",")).values_list("name", flat=True)
    ):
        title += f" in {', '.join(areas)}"
    elif county := County.objects.filter(slug=p.get("county", "")).first():
        title += f" in {county.name}"
    else:
        title += " in Kenya"

    details = []
    if q := p.get("q"):
        details.append(f"“{q}”")
    if beds := p.get("min_beds"):
        details.append(f"{beds}+ beds")
    if baths := p.get("min_baths"):
        details.append(f"{baths}+ baths")
    low, high = p.get("min_price"), p.get("max_price")
    if low and high:
        details.append(f"{_price(low)}–{int(high):,}")  # noqa: RUF001 (en dash)
    elif high:
        details.append(f"up to {_price(high)}")
    elif low:
        details.append(f"from {_price(low)}")
    if furnishing := p.get("furnishing"):
        details.append(str(Furnishing(furnishing).label))
    if amenity_slugs := [s for s in p.get("amenities", "").split(",") if s]:
        amenities = Amenity.objects.filter(slug__in=amenity_slugs).values_list("name", flat=True)
        details.append("with " + ", ".join(amenities))
    return " · ".join([title, *details])[:120]
