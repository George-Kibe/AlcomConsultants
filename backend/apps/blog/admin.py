from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "published_at", "author", "updated_at"]
    list_filter = ["status"]
    search_fields = ["title", "slug"]
    readonly_fields = ["uuid", "created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["author"]
