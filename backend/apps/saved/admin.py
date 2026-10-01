from django.contrib import admin

from .models import Favourite, SavedSearch


@admin.register(Favourite)
class FavouriteAdmin(admin.ModelAdmin):
    list_display = ["user", "property", "created_at"]
    search_fields = ["user__email", "property__title", "property__reference"]
    raw_id_fields = ["user", "property"]


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "alerts", "last_alerted_at", "created_at"]
    list_filter = ["alerts"]
    search_fields = ["name", "user__email"]
    raw_id_fields = ["user"]
    readonly_fields = ["uuid", "created_at", "updated_at"]
