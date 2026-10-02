from django.contrib import admin

from .models import Faq, JobOpening, TeamMember, Testimonial


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "order", "is_published"]
    list_editable = ["order", "is_published"]
    search_fields = ["name", "role"]


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "rating", "order", "is_published"]
    list_editable = ["order", "is_published"]


@admin.register(Faq)
class FaqAdmin(admin.ModelAdmin):
    list_display = ["question", "category", "order", "is_published"]
    list_editable = ["order", "is_published"]
    list_filter = ["category", "is_published"]


@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ["title", "employment_type", "closing_date", "is_published"]
    list_filter = ["is_published", "employment_type"]
    prepopulated_fields = {"slug": ["title"]}
