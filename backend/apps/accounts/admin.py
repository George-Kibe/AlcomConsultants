from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "first_name", "last_name", "is_staff", "is_active", "date_joined"]
    list_filter = ["is_staff", "is_superuser", "is_active", "groups"]
    search_fields = ["email", "first_name", "last_name", "phone"]
    readonly_fields = ["uuid", "date_joined", "last_login", "marketing_opt_in_at"]
    fieldsets = [
        (None, {"fields": ["uuid", "email", "password"]}),
        ("Personal info", {"fields": ["first_name", "last_name", "phone"]}),
        ("Consent", {"fields": ["marketing_opt_in", "marketing_opt_in_at"]}),
        (
            "Permissions",
            {"fields": ["is_active", "is_staff", "is_superuser", "groups", "user_permissions"]},
        ),
        ("Important dates", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (None, {"classes": ["wide"], "fields": ["email", "password1", "password2"]}),
    ]
