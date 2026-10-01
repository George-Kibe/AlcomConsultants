from django.db.models import Prefetch, QuerySet
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from apps.core.media import MediaKind

from .filters import PropertyFilter
from .models import Amenity, Property, PropertyMedia, PropertyType
from .serializers import (
    AmenitySerializer,
    PropertyDetailSerializer,
    PropertyListSerializer,
    PropertyTypeSerializer,
)


class PropertyViewSet(viewsets.ReadOnlyModelViewSet[Property]):
    """Public listings. Search shows active listings; sold/let pages stay reachable."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = PropertyFilter
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
