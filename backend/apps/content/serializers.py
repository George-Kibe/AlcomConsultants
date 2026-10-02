from typing import Any

from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core import media

from .models import Faq, JobOpening, TeamMember, Testimonial


class PhotoSerializer(serializers.Serializer[Any]):
    public_id = serializers.CharField()
    width = serializers.IntegerField(allow_null=True)
    height = serializers.IntegerField(allow_null=True)
    url = serializers.CharField()


class PhotoUploadSerializer(serializers.Serializer[Any]):
    """A signed direct-upload result from Cloudinary (target "team")."""

    public_id = serializers.CharField(max_length=255)
    version = serializers.IntegerField()
    signature = serializers.CharField()
    width = serializers.IntegerField(required=False, allow_null=True)
    height = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not media.is_authentic_upload(attrs["public_id"], attrs["version"], attrs["signature"]):
            raise serializers.ValidationError("This upload could not be verified.")
        if not attrs["public_id"].startswith(f"{media.settings.CLOUDINARY_FOLDER}/team/"):
            raise serializers.ValidationError("Upload is not in the team folder.")
        return attrs


# ------------------------------------------------------------------ public


class TeamMemberSerializer(serializers.ModelSerializer[TeamMember]):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ["uuid", "name", "role", "bio", "photo", "email", "linkedin_url"]

    @extend_schema_field(PhotoSerializer(allow_null=True))
    def get_photo(self, member: TeamMember) -> dict[str, Any] | None:
        if not member.photo_public_id:
            return None
        return {
            "public_id": member.photo_public_id,
            "width": member.photo_width,
            "height": member.photo_height,
            "url": member.photo_url,
        }


class TestimonialSerializer(serializers.ModelSerializer[Testimonial]):
    class Meta:
        model = Testimonial
        fields = ["uuid", "quote", "name", "role", "rating"]


class FaqSerializer(serializers.ModelSerializer[Faq]):
    class Meta:
        model = Faq
        fields = ["uuid", "question", "answer", "category"]


class JobListSerializer(serializers.ModelSerializer[JobOpening]):
    employment_type_label = serializers.CharField(
        source="get_employment_type_display", read_only=True
    )
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = JobOpening
        fields = [
            "slug",
            "title",
            "location",
            "employment_type",
            "employment_type_label",
            "summary",
            "closing_date",
            "is_open",
            "published_at",
        ]


class JobDetailSerializer(JobListSerializer):
    class Meta(JobListSerializer.Meta):
        fields = [*JobListSerializer.Meta.fields, "description", "apply_email"]


# ------------------------------------------------------------------ dashboard


class OrderableFields:
    common = ["uuid", "order", "is_published", "created_at", "updated_at"]
    read_only = ["uuid", "order", "created_at", "updated_at"]


class DashboardTeamMemberSerializer(TeamMemberSerializer):
    photo_upload = PhotoUploadSerializer(write_only=True, required=False)
    remove_photo = serializers.BooleanField(write_only=True, required=False)

    class Meta(TeamMemberSerializer.Meta):
        fields = [
            *TeamMemberSerializer.Meta.fields,
            *OrderableFields.common,
            "photo_upload",
            "remove_photo",
        ]
        read_only_fields = OrderableFields.read_only

    def _apply_photo(self, validated_data: dict[str, Any], member: TeamMember | None) -> str:
        """Set or clear the photo; returns the replaced public id (to delete), if any."""
        upload = validated_data.pop("photo_upload", None)
        remove = validated_data.pop("remove_photo", False)
        old = member.photo_public_id if member else ""
        if upload:
            validated_data["photo_public_id"] = upload["public_id"]
            validated_data["photo_width"] = upload.get("width")
            validated_data["photo_height"] = upload.get("height")
        elif remove:
            validated_data["photo_public_id"] = ""
            validated_data["photo_width"] = validated_data["photo_height"] = None
        else:
            return ""
        return old

    def create(self, validated_data: dict[str, Any]) -> TeamMember:
        self._apply_photo(validated_data, None)
        return super().create(validated_data)

    def update(self, member: TeamMember, validated_data: dict[str, Any]) -> TeamMember:
        from apps.core.signals import schedule_cloudinary_delete

        old = self._apply_photo(validated_data, member)
        member = super().update(member, validated_data)
        if old and old != member.photo_public_id:
            schedule_cloudinary_delete(old)
        return member


class DashboardTestimonialSerializer(TestimonialSerializer):
    class Meta(TestimonialSerializer.Meta):
        fields = [*TestimonialSerializer.Meta.fields, *OrderableFields.common]
        read_only_fields = OrderableFields.read_only

    def validate_rating(self, value: int | None) -> int | None:
        if value is not None and not 1 <= value <= 5:
            raise serializers.ValidationError("Choose 1 to 5 stars.")
        return value


class DashboardFaqSerializer(FaqSerializer):
    class Meta(FaqSerializer.Meta):
        fields = [*FaqSerializer.Meta.fields, *OrderableFields.common]
        read_only_fields = OrderableFields.read_only


class DashboardJobSerializer(JobDetailSerializer):
    slug = serializers.CharField(max_length=120, required=False, allow_blank=True)

    class Meta(JobDetailSerializer.Meta):
        fields = [
            "uuid",
            *JobDetailSerializer.Meta.fields,
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["uuid", "published_at", "created_at", "updated_at"]

    def validate_slug(self, value: str) -> str:
        if not value:
            return value
        value = slugify(value)
        others = (
            JobOpening.objects.exclude(pk=self.instance.pk) if self.instance else JobOpening.objects
        )
        if others.filter(slug=value).exists():
            raise serializers.ValidationError("Another job already uses this web address.")
        return value


class ContentReorderSerializer(serializers.Serializer[Any]):
    uuids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
