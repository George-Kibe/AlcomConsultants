from django.db.models import Prefetch, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Area, County, Neighbourhood
from .serializers import CountyTreeSerializer, LocationMatchSerializer

SUGGESTION_LIMIT = 10


class CountyTreeView(generics.ListAPIView[County]):
    """All counties with their areas (for location pickers)."""

    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = CountyTreeSerializer
    queryset = County.objects.prefetch_related(
        Prefetch("areas", queryset=Area.objects.order_by("name"))
    )


class LocationSearchView(APIView):
    """Autocomplete across counties, areas and neighbourhoods (`?q=kili`)."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("q", str, required=True, description="At least 2 letters")],
        responses=LocationMatchSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response([])
        starts = Q(name__istartswith=q)
        results: list[dict[str, str]] = []
        for n in Neighbourhood.objects.filter(starts).select_related("area__county")[:5]:
            results.append(
                {
                    "kind": "neighbourhood",
                    "text": f"{n.name}, {n.area.name}",
                    "county": n.area.county.slug,
                    "area": n.area.slug,
                    "neighbourhood": n.slug,
                }
            )
        for a in Area.objects.filter(starts).select_related("county")[:SUGGESTION_LIMIT]:
            results.append(
                {
                    "kind": "area",
                    "text": f"{a.name}, {a.county.name}",
                    "county": a.county.slug,
                    "area": a.slug,
                    "neighbourhood": "",
                }
            )
        for c in County.objects.filter(starts)[:3]:
            results.append(
                {
                    "kind": "county",
                    "text": f"{c.name} County",
                    "county": c.slug,
                    "area": "",
                    "neighbourhood": "",
                }
            )
        return Response(LocationMatchSerializer(results[:SUGGESTION_LIMIT], many=True).data)
