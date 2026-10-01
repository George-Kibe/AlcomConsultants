from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Project
from .serializers import ProjectDetailSerializer, ProjectListSerializer


class ProjectViewSet(viewsets.ReadOnlyModelViewSet[Project]):
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Project]:
        qs = Project.objects.filter(is_published=True).select_related("area__county")
        qs = qs.prefetch_related("media", "unit_types")
        if self.action == "retrieve":
            qs = qs.prefetch_related("updates")
        return qs

    def get_serializer_class(self) -> type[ProjectListSerializer]:
        return ProjectDetailSerializer if self.action == "retrieve" else ProjectListSerializer
