from django.contrib import admin

from .models import Enquiry, Note


class NoteInline(admin.TabularInline):
    model = Note
    extra = 0
    fields = ["created_at", "author", "body", "is_system"]
    readonly_fields = ["created_at", "author", "is_system"]


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ["reference", "name", "kind", "stage", "assigned_to", "is_spam", "created_at"]
    list_filter = ["kind", "stage", "is_spam"]
    search_fields = ["reference", "name", "email", "phone", "property_label"]
    raw_id_fields = ["property", "user", "assigned_to"]
    readonly_fields = [
        "uuid",
        "reference",
        "consent_at",
        "consent_version",
        "spam_check",
        "closed_at",
        "created_at",
        "updated_at",
    ]
    inlines = [NoteInline]
