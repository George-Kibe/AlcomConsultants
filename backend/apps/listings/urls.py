from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.locations.views import CountyTreeView, LocationSearchView
from apps.projects.views import ProjectViewSet

from .views import AmenityListView, PropertyTypeListView, PropertyViewSet

router = SimpleRouter(trailing_slash=True)
router.register("properties", PropertyViewSet, basename="property")
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
    path("property-types/", PropertyTypeListView.as_view(), name="property-types"),
    path("amenities/", AmenityListView.as_view(), name="amenities"),
    path("locations/", CountyTreeView.as_view(), name="locations"),
    path("locations/search/", LocationSearchView.as_view(), name="location-search"),
]
