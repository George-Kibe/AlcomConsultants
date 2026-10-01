from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import Area, County, Neighbourhood


class AreaInline(admin.TabularInline):
    model = Area
    fields = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}
    extra = 0
    show_change_link = True


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ["name", "code"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [AreaInline]


class NeighbourhoodInline(admin.TabularInline):
    model = Neighbourhood
    fields = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}
    extra = 0


@admin.register(Area)
class AreaAdmin(GISModelAdmin):
    list_display = ["name", "county"]
    list_filter = ["county"]
    search_fields = ["name", "county__name"]
    list_select_related = ["county"]
    prepopulated_fields = {"slug": ["name"]}
    autocomplete_fields = ["county"]
    inlines = [NeighbourhoodInline]


@admin.register(Neighbourhood)
class NeighbourhoodAdmin(GISModelAdmin):
    list_display = ["name", "area"]
    list_filter = ["area__county"]
    search_fields = ["name", "area__name"]
    list_select_related = ["area__county"]
    prepopulated_fields = {"slug": ["name"]}
    autocomplete_fields = ["area"]
