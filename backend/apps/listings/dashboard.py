"""Staff dashboard endpoints for listings."""

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStaff

from .models import Property, Status


class OverviewView(APIView):
    """Headline numbers for the dashboard home page."""

    permission_classes = [IsStaff]

    @extend_schema(
        responses=inline_serializer(
            "DashboardOverview",
            {
                "listed": serializers.IntegerField(),
                "drafts": serializers.IntegerField(),
                "under_offer": serializers.IntegerField(),
                "closed": serializers.IntegerField(),
                "featured": serializers.IntegerField(),
            },
        )
    )
    def get(self, request: Request) -> Response:
        counts = Property.objects.aggregate(
            listed=Count("pk", filter=Q(status=Status.PUBLISHED)),
            drafts=Count("pk", filter=Q(status=Status.DRAFT)),
            under_offer=Count("pk", filter=Q(status=Status.UNDER_OFFER)),
            closed=Count("pk", filter=Q(status__in=[Status.SOLD, Status.LET])),
            featured=Count("pk", filter=Q(is_featured=True, status=Status.PUBLISHED)),
        )
        return Response(counts)
