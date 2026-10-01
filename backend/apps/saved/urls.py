from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import FavouriteViewSet, SavedSearchViewSet, UnsubscribeView

router = SimpleRouter(trailing_slash=True)
router.register("me/saved-searches", SavedSearchViewSet, basename="saved-search")

urlpatterns = [
    path("", include(router.urls)),
    path("me/favourites/", FavouriteViewSet.as_view({"get": "list"}), name="favourite-list"),
    path(
        "me/favourites/slugs/",
        FavouriteViewSet.as_view({"get": "slugs"}),
        name="favourite-slugs",
    ),
    path(
        "me/favourites/<slug:slug>/",
        FavouriteViewSet.as_view({"put": "add", "delete": "remove"}),
        name="favourite-detail",
    ),
    path("alerts/unsubscribe/", UnsubscribeView.as_view(), name="alerts-unsubscribe"),
]
