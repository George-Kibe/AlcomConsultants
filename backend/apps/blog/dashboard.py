"""Staff blog management: posts and their cover photo."""

from typing import Any

import django_filters
from django.db import transaction
from django.db.models import Q, QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.permissions import IsStaff
from apps.core.signals import schedule_cloudinary_delete

from .models import Post, PostStatus
from .serializers import (
    CoverUploadSerializer,
    DashboardPostListSerializer,
    DashboardPostSerializer,
)


class DashboardPostFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=PostStatus.choices)
    q = django_filters.CharFilter(method="search", label="Search titles")

    class Meta:
        model = Post
        fields = ["status"]

    def search(self, qs: QuerySet[Post], name: str, value: str) -> QuerySet[Post]:
        return qs.filter(Q(title__icontains=value) | Q(slug__icontains=value)) if value else qs


class DashboardPostViewSet(viewsets.ModelViewSet[Post]):
    """Staff blog posts. Published posts are unpublished (back to draft), not deleted."""

    permission_classes = [IsStaff]
    lookup_field = "uuid"
    filterset_class = DashboardPostFilter
    ordering_fields: list[str] = []
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Post]:
        return Post.objects.select_related("author", "updated_by").order_by("-updated_at")

    def get_serializer_class(self) -> type[DashboardPostListSerializer]:
        return DashboardPostListSerializer if self.action == "list" else DashboardPostSerializer

    def perform_create(self, serializer: serializers.BaseSerializer[Post]) -> None:
        user = self.request.user
        serializer.save(author=user, created_by=user, updated_by=user)

    def perform_update(self, serializer: serializers.BaseSerializer[Post]) -> None:
        serializer.save(updated_by=self.request.user)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        post = self.get_object()
        if post.status != PostStatus.DRAFT:
            return Response(
                {"detail": "Only drafts can be deleted. Unpublish this post first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        methods=["POST"], request=CoverUploadSerializer, responses=DashboardPostSerializer
    )
    @extend_schema(methods=["DELETE"], request=None, responses=DashboardPostSerializer)
    @action(detail=True, methods=["post", "delete"])
    def cover(self, request: Request, uuid: str) -> Response:
        """Set (replacing any previous one) or remove the cover photo."""
        post = self.get_object()
        old = post.cover_public_id
        if request.method == "DELETE":
            if post.status == PostStatus.PUBLISHED:
                return Response(
                    {"detail": "A published post needs a cover photo. Replace it instead."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            post.cover_public_id, post.cover_width, post.cover_height = "", None, None
        else:
            payload = CoverUploadSerializer(data=request.data)
            payload.is_valid(raise_exception=True)
            data = payload.validated_data
            post.cover_public_id = data["public_id"]
            post.cover_width, post.cover_height = data.get("width"), data.get("height")
            if "alt_text" in data:
                post.cover_alt = data["alt_text"]
        post.updated_by = request.user  # type: ignore[assignment]
        with transaction.atomic():
            post.save()
            if old and old != post.cover_public_id:
                schedule_cloudinary_delete(old)
        return Response(DashboardPostSerializer(post).data)
