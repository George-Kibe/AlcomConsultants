from typing import Any

from django.db import transaction
from django.db.models import Model, QuerySet
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.permissions import IsStaff

from .models import Faq, FaqCategory, JobOpening, TeamMember, Testimonial
from .serializers import (
    ContentReorderSerializer,
    DashboardFaqSerializer,
    DashboardJobSerializer,
    DashboardTeamMemberSerializer,
    DashboardTestimonialSerializer,
    FaqSerializer,
    JobDetailSerializer,
    JobListSerializer,
    TeamMemberSerializer,
    TestimonialSerializer,
)

# ------------------------------------------------------------------ public


class PublicList(generics.ListAPIView[Any]):
    permission_classes = [AllowAny]
    pagination_class = None
    filter_backends: list[Any] = []


class TeamListView(PublicList):
    """Team members shown on the website, in order."""

    serializer_class = TeamMemberSerializer
    queryset = TeamMember.objects.filter(is_published=True)


class TestimonialListView(PublicList):
    serializer_class = TestimonialSerializer
    queryset = Testimonial.objects.filter(is_published=True)


@extend_schema(
    parameters=[
        OpenApiParameter(
            "category", str, description="Comma-separated categories, e.g. valuation,general"
        )
    ]
)
class FaqListView(PublicList):
    """FAQs shown on the website; `?category=valuation,general` narrows them."""

    serializer_class = FaqSerializer

    def get_queryset(self) -> QuerySet[Faq]:
        qs = Faq.objects.filter(is_published=True)
        wanted = [c for c in self.request.query_params.get("category", "").split(",") if c]
        valid = [c for c in wanted if c in FaqCategory.values]
        return qs.filter(category__in=valid) if wanted else qs


class JobListView(PublicList):
    """Open vacancies (published, closing date not passed)."""

    serializer_class = JobListSerializer
    queryset = JobOpening.objects.open()


class JobDetailView(generics.RetrieveAPIView[JobOpening]):
    """A published vacancy (still reachable after it closes, marked as closed)."""

    permission_classes = [AllowAny]
    serializer_class = JobDetailSerializer
    lookup_field = "slug"
    queryset = JobOpening.objects.visible()


# ------------------------------------------------------------------ dashboard


class OrderedViewSet(viewsets.ModelViewSet[Any]):
    """Staff CRUD for an orderable model; new items go to the end; `reorder` saves a drag."""

    permission_classes = [IsStaff]
    lookup_field = "uuid"
    pagination_class = None
    filter_backends: list[Any] = []
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    model: type[Model]

    def get_queryset(self) -> QuerySet[Any]:
        return self.model._default_manager.all()

    def perform_create(self, serializer: serializers.BaseSerializer[Any]) -> None:
        last = self.get_queryset().order_by("-order").values_list("order", flat=True).first()
        serializer.save(order=(last or 0) + 1)

    @extend_schema(request=ContentReorderSerializer, responses={204: None})
    @action(detail=False, methods=["post"])
    def reorder(self, request: Request) -> Response:
        """Save a new order: every item's uuid, top to bottom."""
        payload = ContentReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        uuids = payload.validated_data["uuids"]
        items = {str(i.uuid): i for i in self.get_queryset().filter(uuid__in=uuids)}
        if len(items) != len(set(map(str, uuids))):
            return Response({"uuids": ["Unknown item."]}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for position, uuid in enumerate(uuids, start=1):
                item = items[str(uuid)]
                item.order = position
                item.save(update_fields=["order", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DashboardTeamViewSet(OrderedViewSet):
    model = TeamMember
    serializer_class = DashboardTeamMemberSerializer


class DashboardTestimonialViewSet(OrderedViewSet):
    model = Testimonial
    serializer_class = DashboardTestimonialSerializer


class DashboardFaqViewSet(OrderedViewSet):
    model = Faq
    serializer_class = DashboardFaqSerializer


class DashboardJobViewSet(viewsets.ModelViewSet[JobOpening]):
    permission_classes = [IsStaff]
    lookup_field = "uuid"
    pagination_class = None
    filter_backends: list[Any] = []
    serializer_class = DashboardJobSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    queryset = JobOpening.objects.order_by("-created_at")
