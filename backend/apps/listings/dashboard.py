"""Staff dashboard endpoints for listings (all require IsStaff)."""

from typing import Any

from django.contrib.gis.geos import Point
from django.db.models import Count, Prefetch, Q, QuerySet
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_field, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.media import MediaKind
from apps.core.permissions import IsStaff
from apps.locations.models import Area, County, Neighbourhood
from apps.projects.models import Project

from .models import Amenity, DealType, Property, PropertyMedia, PropertyType, Status

# Rough bounding box of Kenya, to catch swapped or mistyped coordinates.
KENYA_LAT = (-5.0, 5.5)
KENYA_LNG = (33.5, 42.0)


class OverviewView(APIView):
    """Headline numbers for the dashboard (also used for the status tabs)."""

    permission_classes = [IsStaff]

    @extend_schema(
        responses=inline_serializer(
            "DashboardOverview",
            {
                "total": serializers.IntegerField(),
                "listed": serializers.IntegerField(),
                "drafts": serializers.IntegerField(),
                "under_offer": serializers.IntegerField(),
                "closed": serializers.IntegerField(),
                "archived": serializers.IntegerField(),
                "featured": serializers.IntegerField(),
            },
        )
    )
    def get(self, request: Request) -> Response:
        counts = Property.objects.aggregate(
            total=Count("pk"),
            listed=Count("pk", filter=Q(status=Status.PUBLISHED)),
            drafts=Count("pk", filter=Q(status=Status.DRAFT)),
            under_offer=Count("pk", filter=Q(status=Status.UNDER_OFFER)),
            closed=Count("pk", filter=Q(status__in=[Status.SOLD, Status.LET])),
            archived=Count("pk", filter=Q(status=Status.ARCHIVED)),
            featured=Count("pk", filter=Q(is_featured=True, status=Status.PUBLISHED)),
        )
        return Response(counts)


# ---------------------------------------------------------------------- lookups


class _NamedId(serializers.Serializer[Any]):
    id = serializers.IntegerField()
    name = serializers.CharField()


class _AreaLookup(_NamedId):
    neighbourhoods = _NamedId(many=True)


class _CountyLookup(_NamedId):
    areas = _AreaLookup(many=True)


class _Agent(_NamedId):
    email = serializers.EmailField()


class _Choice(serializers.Serializer[Any]):
    slug = serializers.CharField()
    name = serializers.CharField()
    group = serializers.CharField()


class LookupsSerializer(serializers.Serializer[Any]):
    property_types = _Choice(many=True)
    amenities = _Choice(many=True)
    counties = _CountyLookup(many=True)
    agents = _Agent(many=True)
    projects = _NamedId(many=True)


class LookupsView(APIView):
    """Everything the listing form needs, in one request."""

    permission_classes = [IsStaff]

    @extend_schema(responses=LookupsSerializer)
    def get(self, request: Request) -> Response:
        counties = County.objects.prefetch_related(
            Prefetch(
                "areas",
                queryset=Area.objects.order_by("name").prefetch_related(
                    Prefetch("neighbourhoods", queryset=Neighbourhood.objects.order_by("name"))
                ),
            )
        )
        data = {
            "property_types": [
                {"slug": t.slug, "name": t.name, "group": t.get_category_display()}
                for t in PropertyType.objects.all()
            ],
            "amenities": [
                {"slug": a.slug, "name": a.name, "group": a.group} for a in Amenity.objects.all()
            ],
            "counties": [
                {
                    "id": c.id,
                    "name": c.name,
                    "areas": [
                        {
                            "id": a.id,
                            "name": a.name,
                            "neighbourhoods": [
                                {"id": n.id, "name": n.name} for n in a.neighbourhoods.all()
                            ],
                        }
                        for a in c.areas.all()
                    ],
                }
                for c in counties
            ],
            "agents": [
                {"id": u.id, "name": u.get_full_name() or u.email, "email": u.email}
                for u in User.objects.filter(is_staff=True, is_active=True).order_by(
                    "first_name", "email"
                )
            ],
            "projects": [{"id": p.id, "name": p.name} for p in Project.objects.order_by("name")],
        }
        return Response(LookupsSerializer(data).data)


# ---------------------------------------------------------------------- properties


class DashboardPropertyListSerializer(serializers.ModelSerializer[Property]):
    property_type = serializers.CharField(source="property_type.name")
    location = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    photo_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Property
        fields = [
            "uuid",
            "reference",
            "slug",
            "title",
            "status",
            "deal_type",
            "property_type",
            "price",
            "price_unit",
            "price_on_request",
            "location",
            "cover_image",
            "photo_count",
            "is_featured",
            "published_at",
            "updated_at",
        ]

    def get_location(self, obj: Property) -> str:
        parts = [
            obj.neighbourhood.name if obj.neighbourhood else "",
            obj.area.name,
            obj.area.county.name,
        ]
        return ", ".join(p for p in parts if p)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cover_image(self, obj: Property) -> str | None:
        images = getattr(obj, "images", [])
        return images[0].public_id if images else None


class DashboardPropertySerializer(serializers.ModelSerializer[Property]):
    """Create / edit a listing."""

    property_type = serializers.SlugRelatedField(
        slug_field="slug", queryset=PropertyType.objects.all()
    )
    amenities = serializers.SlugRelatedField(
        slug_field="slug", queryset=Amenity.objects.all(), many=True, required=False
    )
    area = serializers.PrimaryKeyRelatedField(queryset=Area.objects.all())
    county = serializers.IntegerField(source="area.county_id", read_only=True)
    neighbourhood = serializers.PrimaryKeyRelatedField(
        queryset=Neighbourhood.objects.all(), allow_null=True, required=False
    )
    agent = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=True), allow_null=True, required=False
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), allow_null=True, required=False
    )
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "uuid",
            "reference",
            "slug",
            "status",
            "title",
            "description",
            "deal_type",
            "property_type",
            "price",
            "price_unit",
            "price_on_request",
            "bedrooms",
            "bathrooms",
            "parking_spaces",
            "built_area_sqm",
            "land_area",
            "land_area_unit",
            "furnishing",
            "amenities",
            "county",
            "area",
            "neighbourhood",
            "lat",
            "lng",
            "show_exact_location",
            "agent",
            "project",
            "video_url",
            "is_featured",
            "seo_title",
            "seo_description",
            "published_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["uuid", "reference", "slug", "published_at", "created_at", "updated_at"]

    def to_representation(self, instance: Property) -> dict[str, Any]:
        data = super().to_representation(instance)
        data["lat"] = instance.location.y if instance.location else None
        data["lng"] = instance.location.x if instance.location else None
        return data

    def _user(self, user: User | None) -> str | None:
        return (user.get_full_name() or user.email) if user else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by(self, obj: Property) -> str | None:
        return self._user(obj.created_by)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by(self, obj: Property) -> str | None:
        return self._user(obj.updated_by)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        current = self.instance

        def value(name: str) -> Any:
            return attrs[name] if name in attrs else getattr(current, name, None)

        errors: dict[str, str] = {}
        area, hood = value("area"), value("neighbourhood")
        if hood is not None and area is not None and hood.area_id != area.id:
            errors["neighbourhood"] = "This neighbourhood is not in the selected area."
        if value("price") is None and not value("price_on_request"):
            errors["price"] = "Enter a price, or tick 'price on request'."

        if "lat" in attrs or "lng" in attrs:
            lat, lng = attrs.pop("lat", None), attrs.pop("lng", None)
            if (lat is None) != (lng is None):
                errors["lat"] = "Enter both latitude and longitude, or neither."
            elif lat is not None and lng is not None:
                if not (
                    KENYA_LAT[0] <= lat <= KENYA_LAT[1] and KENYA_LNG[0] <= lng <= KENYA_LNG[1]
                ):
                    errors["lat"] = "These coordinates are outside Kenya. Check the map pin."
                else:
                    attrs["location"] = Point(lng, lat, srid=4326)
            else:
                attrs["location"] = None
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data: dict[str, Any]) -> Property:
        user = self.context["request"].user
        validated_data["created_by"] = validated_data["updated_by"] = user
        return super().create(validated_data)

    def update(self, instance: Property, validated_data: dict[str, Any]) -> Property:
        validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)


class DashboardPropertyFilter(filters.FilterSet):
    status = filters.ChoiceFilter(
        choices=[*Status.choices, ("closed", "Sold or let")], method="filter_status"
    )
    deal = filters.ChoiceFilter(field_name="deal_type", choices=DealType.choices)
    q = filters.CharFilter(method="filter_q")
    sort = filters.OrderingFilter(
        fields=[
            ("updated_at", "updated"),
            ("created_at", "created"),
            ("price", "price"),
            ("title", "title"),
        ],
    )

    class Meta:
        model = Property
        fields: list[str] = []

    def filter_status(self, qs: QuerySet[Property], name: str, value: str) -> QuerySet[Property]:
        if value == "closed":
            return qs.filter(status__in=[Status.SOLD, Status.LET])
        return qs.filter(status=value)

    def filter_q(self, qs: QuerySet[Property], name: str, value: str) -> QuerySet[Property]:
        value = value.strip()
        return (
            qs.filter(
                Q(reference__icontains=value)
                | Q(title__icontains=value)
                | Q(area__name__icontains=value)
                | Q(neighbourhood__name__icontains=value)
            )
            if value
            else qs
        )


class DashboardPropertyViewSet(viewsets.ModelViewSet[Property]):
    """Staff listing management. Published listings are archived, not deleted."""

    permission_classes = [IsStaff]
    lookup_field = "uuid"
    filterset_class = DashboardPropertyFilter
    ordering_fields: list[str] = []
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Property]:
        qs = Property.objects.select_related(
            "property_type",
            "area__county",
            "neighbourhood",
            "agent",
            "project",
            "created_by",
            "updated_by",
        ).order_by("-updated_at")
        if self.action == "list":
            images = PropertyMedia.objects.filter(kind=MediaKind.IMAGE).order_by("order", "id")
            qs = qs.annotate(photo_count=Count("media")).prefetch_related(
                Prefetch("media", queryset=images, to_attr="images")
            )
        else:
            qs = qs.prefetch_related("amenities")
        return qs

    def get_serializer_class(self) -> type[serializers.ModelSerializer[Property]]:
        if self.action == "list":
            return DashboardPropertyListSerializer
        return DashboardPropertySerializer

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        prop = self.get_object()
        if prop.status != Status.DRAFT:
            return Response(
                {"detail": "Only drafts can be deleted. Archive this listing instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
