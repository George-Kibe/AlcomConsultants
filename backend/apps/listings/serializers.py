from typing import Any

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.media import MediaKind
from apps.core.serializers import MediaSerializer

from .models import Amenity, Property, PropertyType


class PropertyTypeSerializer(serializers.ModelSerializer[PropertyType]):
    class Meta:
        model = PropertyType
        fields = ["name", "slug", "category"]


class AmenitySerializer(serializers.ModelSerializer[Amenity]):
    class Meta:
        model = Amenity
        fields = ["name", "slug", "group", "icon"]


class LocationSerializer(serializers.Serializer[Property]):
    county = serializers.CharField(source="area.county.name")
    county_slug = serializers.CharField(source="area.county.slug")
    area = serializers.CharField(source="area.name")
    area_slug = serializers.CharField(source="area.slug")
    neighbourhood = serializers.CharField(source="neighbourhood.name", default="")
    neighbourhood_slug = serializers.CharField(source="neighbourhood.slug", default="")
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()
    is_exact = serializers.SerializerMethodField()

    def _point(self, obj: Property) -> tuple[float, float] | None:
        return obj.public_location

    def get_lat(self, obj: Property) -> float | None:
        point = self._point(obj)
        return point[0] if point else None

    def get_lng(self, obj: Property) -> float | None:
        point = self._point(obj)
        return point[1] if point else None

    def get_is_exact(self, obj: Property) -> bool:
        return bool(obj.show_exact_location and obj.location)


class AgentSerializer(serializers.Serializer[Any]):
    name = serializers.CharField(source="get_full_name")
    phone = serializers.CharField()
    email = serializers.EmailField()


#: Photos sent with each search result for the card's swipeable gallery.
CARD_PHOTOS = 8


class CardPhotoSerializer(serializers.Serializer[Any]):
    public_id = serializers.CharField()
    alt_text = serializers.CharField()
    width = serializers.IntegerField(allow_null=True)
    height = serializers.IntegerField(allow_null=True)


class PropertyListSerializer(serializers.ModelSerializer[Property]):
    property_type = PropertyTypeSerializer(read_only=True)
    location = LocationSerializer(source="*", read_only=True)
    cover_image = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField(
        help_text=f"Up to {CARD_PHOTOS} photos for the card gallery, cover first."
    )

    class Meta:
        model = Property
        fields = [
            "reference",
            "slug",
            "title",
            "deal_type",
            "status",
            "property_type",
            "price",
            "price_unit",
            "price_on_request",
            "bedrooms",
            "bathrooms",
            "built_area_sqm",
            "land_area",
            "land_area_unit",
            "location",
            "cover_image",
            "photos",
            "is_featured",
            "published_at",
        ]

    @staticmethod
    def _images(obj: Property) -> list[Any]:
        images = getattr(obj, "images", None)
        if images is None:  # not prefetched (e.g. single object)
            images = [m for m in obj.media.all() if m.kind == MediaKind.IMAGE]
        return list(images)

    @extend_schema_field(MediaSerializer(allow_null=True))
    def get_cover_image(self, obj: Property) -> dict[str, Any] | None:
        images = self._images(obj)
        return MediaSerializer(images[0]).data if images else None

    @extend_schema_field(CardPhotoSerializer(many=True))
    def get_photos(self, obj: Property) -> list[dict[str, Any]]:
        return [
            {
                "public_id": m.public_id,
                "alt_text": m.alt_text or f"{obj.title}, photo {i + 1}",
                "width": m.width,
                "height": m.height,
            }
            for i, m in enumerate(self._images(obj)[:CARD_PHOTOS])
        ]


class PropertyDetailSerializer(PropertyListSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)
    media = MediaSerializer(many=True, read_only=True)
    agent = AgentSerializer(read_only=True, allow_null=True)
    project = serializers.SerializerMethodField()

    class Meta(PropertyListSerializer.Meta):
        fields = [
            *PropertyListSerializer.Meta.fields,
            "description",
            "parking_spaces",
            "furnishing",
            "amenities",
            "media",
            "video_url",
            "agent",
            "project",
            "seo_title",
            "seo_description",
            "updated_at",
        ]

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {"name": {"type": "string"}, "slug": {"type": "string"}},
        }
    )
    def get_project(self, obj: Property) -> dict[str, str] | None:
        p = obj.project
        return {"name": p.name, "slug": p.slug} if p and p.is_published else None


class MapPointSerializer(serializers.ModelSerializer[Property]):
    """Lightweight marker for the search map."""

    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "reference",
            "slug",
            "title",
            "deal_type",
            "price",
            "price_unit",
            "price_on_request",
            "bedrooms",
            "lat",
            "lng",
            "cover_image",
        ]

    def get_lat(self, obj: Property) -> float | None:
        point = obj.public_location
        return point[0] if point else None

    def get_lng(self, obj: Property) -> float | None:
        point = obj.public_location
        return point[1] if point else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cover_image(self, obj: Property) -> str | None:
        images = getattr(obj, "images", [])
        return images[0].public_id if images else None


class NearbyPlaceSerializer(serializers.Serializer[Any]):
    name = serializers.CharField()
    type = serializers.CharField()
    distance_m = serializers.IntegerField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class NearbyGroupSerializer(serializers.Serializer[Any]):
    category = serializers.CharField()
    places = NearbyPlaceSerializer(many=True)
