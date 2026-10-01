from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.locations.views import CountyTreeView, LocationSearchView
from apps.projects.views import ProjectViewSet

from .dashboard import DashboardPropertyViewSet, LookupsView, OverviewView
from .dashboard_media import PropertyMediaViewSet, UploadSignatureView
from .views import AmenityListView, PropertyTypeListView, PropertyViewSet

router = SimpleRouter(trailing_slash=True)
router.register("properties", PropertyViewSet, basename="property")
router.register("projects", ProjectViewSet, basename="project")
router.register("dashboard/properties", DashboardPropertyViewSet, basename="dashboard-property")
router.register(
    r"dashboard/properties/(?P<property_uuid>[0-9a-f-]{36})/media",
    PropertyMediaViewSet,
    basename="dashboard-property-media",
)

urlpatterns = [
    path("", include(router.urls)),
    path("property-types/", PropertyTypeListView.as_view(), name="property-types"),
    path("amenities/", AmenityListView.as_view(), name="amenities"),
    path("locations/", CountyTreeView.as_view(), name="locations"),
    path("locations/search/", LocationSearchView.as_view(), name="location-search"),
    path("dashboard/overview/", OverviewView.as_view(), name="dashboard-overview"),
    path("dashboard/lookups/", LookupsView.as_view(), name="dashboard-lookups"),
    path("dashboard/uploads/signature/", UploadSignatureView.as_view(), name="upload-signature"),
]
