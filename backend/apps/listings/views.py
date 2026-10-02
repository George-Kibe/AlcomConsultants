from typing import Any

from django.db.models import Case, F, IntegerField, Prefetch, QuerySet, Value, When
from django.db.models.functions import Abs
from drf_spectacular.utils import extend_schema
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.media import MediaKind

from .filters import PropertyFilter
from .models import Amenity, Property, PropertyMedia, PropertyType
from .nearby import nearby_places
from .serializers import (
    AmenitySerializer,
    MapPointSerializer,
    NearbyGroupSerializer,
    PropertyDetailSerializer,
    PropertyListSerializer,
    PropertyTypeSerializer,
)

MAP_LIMIT = 500
SIMILAR_LIMIT = 4


class PropertyPagination(PageNumberPagination):
    """20 per page by default; `?page_size=` up to 48 (the home page asks for 6).
    Responses also say which page this is and how many there are."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 48

    def get_paginated_response(self, data: Any) -> Response:
        response = super().get_paginated_response(data)
        page = self.page
        if page is not None:
            response.data["page"] = page.number
            response.data["pages"] = page.paginator.num_pages
            response.data["page_size"] = page.paginator.per_page
        return response

    def get_paginated_response_schema(self, schema: dict[str, Any]) -> dict[str, Any]:
        result = super().get_paginated_response_schema(schema)
        for key in ("page", "pages", "page_size"):
            result["properties"][key] = {"type": "integer"}
            result["required"].append(key)
        return result


class PropertyViewSet(viewsets.ReadOnlyModelViewSet[Property]):
    """Public listings. Search shows active listings; sold/let pages stay reachable."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = PropertyFilter
    pagination_class = PropertyPagination
    ordering_fields: list[str] = []  # sorting is via ?sort=

    def get_queryset(self) -> QuerySet[Property]:
        base = Property.objects.select_related("property_type", "area__county", "neighbourhood")
        if self.action == "retrieve":
            return (
                base.visible()
                .select_related("agent", "project")
                .prefetch_related("amenities", "media")
            )
        images = PropertyMedia.objects.filter(kind=MediaKind.IMAGE).order_by("order", "id")
        return base.listed().prefetch_related(Prefetch("media", queryset=images, to_attr="images"))

    def get_serializer_class(self) -> type[PropertyListSerializer]:
        return PropertyDetailSerializer if self.action == "retrieve" else PropertyListSerializer

    def _listed_with_covers(self) -> QuerySet[Property]:
        images = PropertyMedia.objects.filter(kind=MediaKind.IMAGE).order_by("order", "id")
        return (
            Property.objects.listed()
            .select_related("property_type", "area__county", "neighbourhood")
            .prefetch_related(Prefetch("media", queryset=images, to_attr="images"))
        )

    @extend_schema(responses=MapPointSerializer(many=True))
    @action(detail=False, pagination_class=None)
    def map(self, request: Request) -> Response:
        """Every matching listing as a map marker (same filters as the list, max 500)."""
        qs = self.filter_queryset(self._listed_with_covers())[:MAP_LIMIT]
        points = [p for p in MapPointSerializer(qs, many=True).data if p["lat"] is not None]
        return Response(points)

    @extend_schema(responses=PropertyListSerializer(many=True))
    @action(detail=True, pagination_class=None)
    def similar(self, request: Request, slug: str) -> Response:
        """Up to 4 listings like this one: same deal, then same area/type, closest price."""
        prop = self.get_object()
        rank = Case(
            When(area_id=prop.area_id, property_type_id=prop.property_type_id, then=Value(3)),
            When(area_id=prop.area_id, then=Value(2)),
            When(property_type_id=prop.property_type_id, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
        qs = (
            self._listed_with_covers()
            .filter(deal_type=prop.deal_type)
            .exclude(pk=prop.pk)
            .annotate(rank=rank)
        )
        if prop.price:
            qs = qs.annotate(gap=Abs(F("price") - prop.price)).order_by("-rank", "gap", "-id")
        else:
            qs = qs.order_by("-rank", "-published_at")
        return Response(PropertyListSerializer(qs[:SIMILAR_LIMIT], many=True).data)

    @extend_schema(responses=NearbyGroupSerializer(many=True))
    @action(detail=True, pagination_class=None)
    def nearby(self, request: Request, slug: str) -> Response:
        """Schools, health, shopping, transport and parks within 1.5 km (OpenStreetMap)."""
        point = self.get_object().public_location
        return Response(nearby_places(*point) if point else [])


class PropertyTypeListView(generics.ListAPIView[PropertyType]):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = PropertyTypeSerializer
    queryset = PropertyType.objects.all()


class AmenityListView(generics.ListAPIView[Amenity]):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = AmenitySerializer
    queryset = Amenity.objects.all()
