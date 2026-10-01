from django.conf import settings
from django.contrib import admin
from django.urls import URLPattern, URLResolver, include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAdminUser

api_v1: list[URLPattern | URLResolver] = [
    path("", include("apps.core.urls")),
    path("", include("apps.listings.urls")),
    path("", include("apps.blog.urls")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.saved.urls")),
    path("", include("apps.enquiries.urls")),
    path("auth/", include("allauth.headless.urls")),
    # Provider callbacks for social sign-in (Google): /api/v1/accounts/google/login/callback/
    path("accounts/", include("allauth.urls")),
    path(
        "schema/",
        SpectacularAPIView.as_view(permission_classes=[IsAdminUser] if not settings.DEBUG else []),
        name="schema",
    ),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema", permission_classes=[IsAdminUser] if not settings.DEBUG else []
        ),
        name="api-docs",
    ),
]

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include(api_v1)),
]

admin.site.site_header = "Alcom Consultants Administration"
admin.site.site_title = "Alcom Admin"
