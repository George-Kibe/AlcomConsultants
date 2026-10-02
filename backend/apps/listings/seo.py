"""Data for search engines: the sitemap and the location landing pages."""

from collections import defaultdict
from typing import Any

from django.db.models import Count, Max
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.blog.models import Post
from apps.content.models import JobOpening
from apps.core.demo import demo_q

from .models import Property


class SitemapEntrySerializer(serializers.Serializer[Any]):
    slug = serializers.CharField()
    updated_at = serializers.DateTimeField()


class LocationPageSerializer(serializers.Serializer[Any]):
    deal = serializers.CharField()
    kind = serializers.ChoiceField(choices=["county", "area"])
    slug = serializers.CharField()
    name = serializers.CharField()
    county = serializers.CharField()
    county_slug = serializers.CharField()
    listings = serializers.IntegerField(help_text="Active listings, demo included")
    real_listings = serializers.IntegerField(help_text="Active listings, demo excluded")
    updated_at = serializers.DateTimeField()


def location_pages() -> list[dict[str, Any]]:
    """Every (deal, county) and (deal, area) pair with at least one active listing."""
    real = ~demo_q()
    rows = (
        Property.objects.listed()
        .values(
            "deal_type",
            "area__slug",
            "area__name",
            "area__county__slug",
            "area__county__name",
        )
        .annotate(
            listings=Count("pk"),
            real_listings=Count("pk", filter=real),
            updated_at=Max("updated_at"),
        )
    )
    counties: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {"listings": 0, "real_listings": 0, "updated_at": None}
    )
    pages = []
    for r in rows:
        county = (r["deal_type"], r["area__county__slug"])
        c = counties[county]
        c.update(name=r["area__county__name"])
        c["listings"] += r["listings"]
        c["real_listings"] += r["real_listings"]
        c["updated_at"] = max(filter(None, [c["updated_at"], r["updated_at"]]))
        pages.append(
            {
                "deal": r["deal_type"],
                "kind": "area",
                "slug": r["area__slug"],
                "name": r["area__name"],
                "county": r["area__county__name"],
                "county_slug": r["area__county__slug"],
                "listings": r["listings"],
                "real_listings": r["real_listings"],
                "updated_at": r["updated_at"],
            }
        )
    for (deal, slug), c in counties.items():
        pages.append(
            {
                "deal": deal,
                "kind": "county",
                "slug": slug,
                "name": c["name"],
                "county": c["name"],
                "county_slug": slug,
                "listings": c["listings"],
                "real_listings": c["real_listings"],
                "updated_at": c["updated_at"],
            }
        )
    return sorted(pages, key=lambda p: (-p["listings"], p["name"]))


class LocationPagesView(APIView):
    """Location landing pages (e.g. property for rent in Kilimani), busiest first."""

    permission_classes = [AllowAny]

    @extend_schema(responses=LocationPageSerializer(many=True))
    def get(self, request: Request) -> Response:
        return Response(location_pages())


class SitemapView(APIView):
    """Everything worth listing in sitemap.xml. Demo listings and articles are left out."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            "Sitemap",
            {
                "properties": SitemapEntrySerializer(many=True),
                "posts": SitemapEntrySerializer(many=True),
                "jobs": SitemapEntrySerializer(many=True),
                "locations": LocationPageSerializer(many=True),
            },
        )
    )
    def get(self, request: Request) -> Response:
        def entries(qs: Any) -> list[dict[str, Any]]:
            return list(qs.values("slug", "updated_at").order_by("-updated_at"))

        return Response(
            {
                "properties": entries(Property.objects.visible().exclude(demo_q())),
                "posts": entries(Post.objects.published().exclude(demo_q())),
                "jobs": entries(JobOpening.objects.open()),
                "locations": [p for p in location_pages() if p["real_listings"]],
            }
        )
