from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .models import Post
from .serializers import PostDetailSerializer, PostListSerializer


class BlogPagination(PageNumberPagination):
    page_size = 12


class PostViewSet(viewsets.ReadOnlyModelViewSet[Post]):
    """Published blog posts, newest first."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    pagination_class = BlogPagination

    def get_queryset(self) -> QuerySet[Post]:
        return Post.objects.published().select_related("author").order_by("-published_at")

    def get_serializer_class(self) -> type[PostListSerializer]:
        return PostDetailSerializer if self.action == "retrieve" else PostListSerializer
