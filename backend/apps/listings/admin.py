from typing import Any

from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.db.models import Count, QuerySet
from django.http import HttpRequest

from apps.core.admin_media import MediaInline

from .models import Amenity, Property, PropertyMedia, PropertyType


@admin.register(PropertyType)
class PropertyTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "order"]
    list_editable = ["order"]
    list_filter = ["category"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ["name", "group", "icon"]
    list_filter = ["group"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ["name"]}


class PropertyMediaInline(MediaInline):
    model = PropertyMedia
    upload_folder = "properties"


@admin.register(Property)
class PropertyAdmin(GISModelAdmin):
    list_display = [
        "reference",
        "title",
        "deal_type",
        "property_type",
        "area",
        "price",
        "status",
        "is_featured",
        "photos",
        "published_at",
    ]
    list_filter = ["status", "deal_type", "property_type", "is_featured", "area__county"]
    list_editable = ["status", "is_featured"]
    search_fields = ["reference", "title", "area__name", "neighbourhood__name"]
    list_select_related = ["property_type", "area__county"]
    autocomplete_fields = ["area", "neighbourhood", "agent", "project"]
    filter_horizontal = ["amenities"]
    readonly_fields = ["reference", "slug", "uuid", "published_at", "created_at", "updated_at"]
    date_hierarchy = "created_at"
    inlines = [PropertyMediaInline]
    fieldsets = [
        (None, {"fields": ["reference", "title", "description", "status", "is_featured"]}),
        (
            "Deal",
            {"fields": ["deal_type", "property_type", "price", "price_unit", "price_on_request"]},
        ),
        (
            "Details",
            {
                "fields": [
                    "bedrooms",
                    "bathrooms",
                    "parking_spaces",
                    "built_area_sqm",
                    "land_area",
                    "land_area_unit",
                    "furnishing",
                    "amenities",
                ]
            },
        ),
        ("Location", {"fields": ["area", "neighbourhood", "location", "show_exact_location"]}),
        ("Contact & links", {"fields": ["agent", "project", "video_url"]}),
        ("SEO", {"classes": ["collapse"], "fields": ["seo_title", "seo_description"]}),
        (
            "System",
            {
                "classes": ["collapse"],
                "fields": ["slug", "uuid", "published_at", "created_at", "updated_at"],
            },
        ),
    ]

    def get_queryset(self, request: HttpRequest) -> QuerySet[Property]:
        return super().get_queryset(request).annotate(photo_count=Count("media"))

    @admin.display(description="Photos", ordering="photo_count")
    def photos(self, obj: Any) -> int:
        return int(obj.photo_count)
