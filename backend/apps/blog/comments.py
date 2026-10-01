"""Blog comments: public list/create/delete-own, and staff moderation."""

import re
from typing import Any

import django_filters
from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema_field
from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.request import Request
from rest_framework.throttling import UserRateThrottle

from apps.accounts.serializers import can_comment
from apps.core.permissions import IsStaff

from .models import Comment, Post

MAX_LINKS = 2
URL = re.compile(r"https?://|www\.", re.IGNORECASE)


class CommentBurstThrottle(UserRateThrottle):
    scope = "comments_burst"


class CommentDailyThrottle(UserRateThrottle):
    scope = "comments_daily"


class CanCommentOrReadOnly(permissions.BasePermission):
    message = "Verify your email address to comment."

    def has_permission(self, request: Request, view: Any) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method == "DELETE":
            return True
        return can_comment(request.user)

    def has_object_permission(self, request: Request, view: Any, obj: Comment) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        mine = obj.author_id is not None and obj.author_id == request.user.pk
        return mine or bool(request.user.is_staff)


class CommentSerializer(serializers.ModelSerializer[Comment]):
    author_name = serializers.CharField(read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "author_name", "body", "created_at", "is_mine"]
        read_only_fields = ["id", "created_at"]

    def get_is_mine(self, comment: Comment) -> bool:
        request = self.context.get("request")
        return bool(
            request and comment.author_id is not None and comment.author_id == request.user.pk
        )

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Write a comment first.")
        if len(URL.findall(value)) > MAX_LINKS:
            raise serializers.ValidationError(f"Comments can contain at most {MAX_LINKS} links.")
        return value


class CommentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet[Comment],
):
    """Visible comments on a published post, oldest first."""

    serializer_class = CommentSerializer
    permission_classes = [CanCommentOrReadOnly]
    pagination_class = None
    filter_backends: list[Any] = []

    def get_throttles(self) -> list[Any]:
        if self.request.method == "POST":
            return [CommentBurstThrottle(), CommentDailyThrottle()]
        return super().get_throttles()

    def get_post(self) -> Post:
        return get_object_or_404(Post.objects.published(), slug=self.kwargs["post_slug"])

    def get_queryset(self) -> QuerySet[Comment]:
        if getattr(self, "swagger_fake_view", False):  # OpenAPI schema generation
            return Comment.objects.none()
        return (
            Comment.objects.filter(post=self.get_post(), is_hidden=False)
            .select_related("author")
            .order_by("created_at")
        )

    def perform_create(self, serializer: serializers.BaseSerializer[Comment]) -> None:
        serializer.save(post=self.get_post(), author=self.request.user)


# ------------------------------------------------------------------ dashboard


class DashboardCommentSerializer(serializers.ModelSerializer[Comment]):
    author_name = serializers.CharField(read_only=True)
    author_email = serializers.SerializerMethodField()
    post = serializers.SerializerMethodField()
    hidden_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "author_name",
            "author_email",
            "body",
            "created_at",
            "is_hidden",
            "hidden_by_name",
            "hidden_at",
        ]
        read_only_fields = ["id", "body", "created_at", "hidden_at"]

    @extend_schema_field(
        serializers.DictField(child=serializers.CharField())  # {uuid, title, slug}
    )
    def get_post(self, comment: Comment) -> dict[str, str]:
        post = comment.post
        return {"uuid": str(post.uuid), "title": post.title, "slug": post.slug}

    def get_author_email(self, comment: Comment) -> str:
        """Empty for a reader who has deleted their account."""
        return comment.author.email if comment.author else ""

    def get_hidden_by_name(self, comment: Comment) -> str:
        user = comment.hidden_by
        return (user.get_full_name() or user.email) if user else ""

    def update(self, comment: Comment, validated_data: dict[str, Any]) -> Comment:
        if "is_hidden" in validated_data and validated_data["is_hidden"] != comment.is_hidden:
            if validated_data["is_hidden"]:
                comment.hide(self.context["request"].user)
            else:
                comment.unhide()
            comment.save(update_fields=["is_hidden", "hidden_by", "hidden_at", "updated_at"])
        return comment


class DashboardCommentFilter(django_filters.FilterSet):
    hidden = django_filters.BooleanFilter(field_name="is_hidden")
    post = django_filters.UUIDFilter(field_name="post__uuid")
    q = django_filters.CharFilter(method="search", label="Search comments")

    class Meta:
        model = Comment
        fields = ["hidden", "post"]

    def search(self, qs: QuerySet[Comment], name: str, value: str) -> QuerySet[Comment]:
        if not value:
            return qs
        return qs.filter(
            Q(body__icontains=value)
            | Q(author__email__icontains=value)
            | Q(author__first_name__icontains=value)
            | Q(post__title__icontains=value)
        )


class DashboardCommentViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet[Comment],
):
    """All comments, newest first. Staff hide (or restore) comments, or delete them."""

    permission_classes = [IsStaff]
    serializer_class = DashboardCommentSerializer
    filterset_class = DashboardCommentFilter
    ordering_fields: list[str] = []
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Comment]:
        return Comment.objects.select_related("post", "author", "hidden_by").order_by("-created_at")
