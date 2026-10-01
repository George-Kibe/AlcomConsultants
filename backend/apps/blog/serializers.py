from typing import Any

from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Post, PostStatus


class CoverSerializer(serializers.Serializer[Any]):
    public_id = serializers.CharField()
    alt_text = serializers.CharField()
    width = serializers.IntegerField(allow_null=True)
    height = serializers.IntegerField(allow_null=True)
    url = serializers.CharField()


def cover_data(post: Post) -> dict[str, Any] | None:
    if not post.cover_public_id:
        return None
    return {
        "public_id": post.cover_public_id,
        "alt_text": post.cover_alt or post.title,
        "width": post.cover_width,
        "height": post.cover_height,
        "url": post.cover_url,
    }


class PostListSerializer(serializers.ModelSerializer[Post]):
    excerpt = serializers.CharField(source="summary", read_only=True)
    cover = serializers.SerializerMethodField()
    author_name = serializers.CharField(read_only=True)
    reading_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Post
        fields = [
            "slug",
            "title",
            "excerpt",
            "cover",
            "published_at",
            "author_name",
            "reading_minutes",
        ]

    @extend_schema_field(CoverSerializer(allow_null=True))
    def get_cover(self, post: Post) -> dict[str, Any] | None:
        return cover_data(post)


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = [
            *PostListSerializer.Meta.fields,
            "body",
            "seo_title",
            "seo_description",
            "updated_at",
        ]


# ------------------------------------------------------------------ dashboard


class DashboardPostListSerializer(serializers.ModelSerializer[Post]):
    author_name = serializers.CharField(read_only=True)
    cover = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "uuid",
            "title",
            "slug",
            "status",
            "published_at",
            "updated_at",
            "author_name",
            "cover",
        ]

    @extend_schema_field(CoverSerializer(allow_null=True))
    def get_cover(self, post: Post) -> dict[str, Any] | None:
        return cover_data(post)


class DashboardPostSerializer(DashboardPostListSerializer):
    slug = serializers.CharField(max_length=120, required=False, allow_blank=True)
    cover_alt = serializers.CharField(max_length=200, required=False, allow_blank=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            *DashboardPostListSerializer.Meta.fields,
            "excerpt",
            "body",
            "cover_alt",
            "seo_title",
            "seo_description",
            "created_at",
            "updated_by_name",
        ]
        read_only_fields = ["uuid", "published_at", "updated_at", "created_at"]

    def get_updated_by_name(self, post: Post) -> str:
        user = post.updated_by
        return (user.get_full_name() or user.email) if user else ""

    def validate_slug(self, value: str) -> str:
        """Free text becomes a web address ("Valuation 101!" -> "valuation-101")."""
        value = slugify(value)
        if not value:
            raise serializers.ValidationError("Enter a web address using letters or numbers.")
        others = Post.objects.exclude(pk=self.instance.pk) if self.instance else Post.objects
        if others.filter(slug=value).exists():
            raise serializers.ValidationError("Another post already uses this web address.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        post = self.instance
        status = attrs.get("status", post.status if post else PostStatus.DRAFT)
        if status == PostStatus.PUBLISHED:
            errors = {}
            body = attrs.get("body", post.body if post else "")
            if not body or not body.strip():
                errors["body"] = "Write the article before publishing."
            if not (post and post.cover_public_id):
                errors["cover"] = "Add a cover photo before publishing."
            if errors:
                raise serializers.ValidationError(errors)
        return attrs
