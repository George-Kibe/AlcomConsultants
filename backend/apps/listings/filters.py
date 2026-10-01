from django.db.models import Q, QuerySet
from django_filters import rest_framework as filters

from .models import DealType, Furnishing, Property


class SlugInFilter(filters.BaseInFilter, filters.CharFilter):
    """Comma-separated slugs: ?type=apartment,house"""


class PropertyFilter(filters.FilterSet):
    deal = filters.ChoiceFilter(field_name="deal_type", choices=DealType.choices)
    type = SlugInFilter(field_name="property_type__slug")
    county = filters.CharFilter(field_name="area__county__slug")
    area = SlugInFilter(field_name="area__slug")
    neighbourhood = SlugInFilter(field_name="neighbourhood__slug")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    min_beds = filters.NumberFilter(field_name="bedrooms", lookup_expr="gte")
    min_baths = filters.NumberFilter(field_name="bathrooms", lookup_expr="gte")
    furnishing = filters.ChoiceFilter(choices=Furnishing.choices)
    amenities = filters.CharFilter(
        method="filter_amenities", help_text="Must have all of: ?amenities=gym,lift"
    )
    featured = filters.BooleanFilter(field_name="is_featured")
    q = filters.CharFilter(method="filter_q", help_text="Keyword, reference or place name")
    sort = filters.ChoiceFilter(
        method="filter_sort",
        choices=[
            ("newest", "Newest"),
            ("price_asc", "Price: low to high"),
            ("price_desc", "Price: high to low"),
        ],
    )

    class Meta:
        model = Property
        fields: list[str] = []

    def filter_amenities(self, qs: QuerySet[Property], name: str, value: str) -> QuerySet[Property]:
        for slug in [s.strip() for s in value.split(",") if s.strip()]:
            qs = qs.filter(amenities__slug=slug)
        return qs.distinct()

    def filter_q(self, qs: QuerySet[Property], name: str, value: str) -> QuerySet[Property]:
        value = value.strip()
        if not value:
            return qs
        return qs.filter(
            Q(reference__iexact=value)
            | Q(title__icontains=value)
            | Q(description__icontains=value)
            | Q(area__name__icontains=value)
            | Q(neighbourhood__name__icontains=value)
            | Q(area__county__name__icontains=value)
        )

    def filter_sort(self, qs: QuerySet[Property], name: str, value: str) -> QuerySet[Property]:
        order = {
            "newest": ["-published_at", "-id"],
            "price_asc": ["price_on_request", "price", "-id"],
            "price_desc": ["price_on_request", "-price", "-id"],
        }[value]
        return qs.order_by(*order)
