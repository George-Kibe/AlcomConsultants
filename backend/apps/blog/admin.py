from django.contrib import admin

from .models import Comment, Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "published_at", "author", "updated_at"]
    list_filter = ["status"]
    search_fields = ["title", "slug"]
    readonly_fields = ["uuid", "created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["author"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["author", "post", "created_at", "is_hidden"]
    list_filter = ["is_hidden"]
    search_fields = ["body", "author__email", "post__title"]
    raw_id_fields = ["post", "author"]
    readonly_fields = ["hidden_by", "hidden_at", "created_at", "updated_at"]
