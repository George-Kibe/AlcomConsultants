from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.serializers import MediaSerializer

from .models import Project, ProjectUpdate, UnitType


class UnitTypeSerializer(serializers.ModelSerializer[UnitType]):
    class Meta:
        model = UnitType
        fields = [
            "name",
            "bedrooms",
            "size_sqm_min",
            "size_sqm_max",
            "price_from",
            "price_to",
            "units_available",
        ]


class ProjectUpdateSerializer(serializers.ModelSerializer[ProjectUpdate]):
    class Meta:
        model = ProjectUpdate
        fields = ["date", "title", "body"]


class ProjectListSerializer(serializers.ModelSerializer[Project]):
    county = serializers.CharField(source="area.county.name")
    area = serializers.CharField(source="area.name")
    cover_image = serializers.SerializerMethodField()
    price_from = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "slug",
            "name",
            "developer",
            "summary",
            "status",
            "completion_date",
            "county",
            "area",
            "cover_image",
            "price_from",
            "is_featured",
        ]

    @extend_schema_field(MediaSerializer(allow_null=True))
    def get_cover_image(self, obj: Project) -> dict[str, object] | None:
        images = [m for m in obj.media.all() if m.kind == "image"]
        return MediaSerializer(images[0]).data if images else None

    def get_price_from(self, obj: Project) -> int | None:
        prices = [u.price_from for u in obj.unit_types.all() if u.price_from]
        return min(prices) if prices else None


class ProjectDetailSerializer(ProjectListSerializer):
    unit_types = UnitTypeSerializer(many=True, read_only=True)
    updates = ProjectUpdateSerializer(many=True, read_only=True)
    media = MediaSerializer(many=True, read_only=True)

    class Meta(ProjectListSerializer.Meta):
        fields = [
            *ProjectListSerializer.Meta.fields,
            "description",
            "video_url",
            "unit_types",
            "updates",
            "media",
        ]
