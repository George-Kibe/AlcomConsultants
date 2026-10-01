from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from apps.core.admin_media import MediaInline

from .models import Project, ProjectMedia, ProjectUpdate, UnitType


class UnitTypeInline(admin.TabularInline):
    model = UnitType
    extra = 0
    fields = [
        "name",
        "bedrooms",
        "size_sqm_min",
        "size_sqm_max",
        "price_from",
        "price_to",
        "units_available",
        "order",
    ]


class ProjectUpdateInline(admin.StackedInline):
    model = ProjectUpdate
    extra = 0


class ProjectMediaInline(MediaInline):
    model = ProjectMedia
    upload_folder = "projects"


@admin.register(Project)
class ProjectAdmin(GISModelAdmin):
    list_display = ["name", "developer", "area", "status", "completion_date", "is_published"]
    list_filter = ["status", "is_published", "area__county"]
    list_editable = ["is_published"]
    search_fields = ["name", "developer", "area__name"]
    list_select_related = ["area__county"]
    autocomplete_fields = ["area", "neighbourhood"]
    prepopulated_fields = {"slug": ["name"]}
    readonly_fields = ["uuid", "created_at", "updated_at"]
    inlines = [UnitTypeInline, ProjectMediaInline, ProjectUpdateInline]
