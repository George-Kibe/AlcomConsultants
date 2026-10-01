from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .dashboard import DashboardPostViewSet
from .views import PostViewSet

router = SimpleRouter(trailing_slash=True)
router.register("blog/posts", PostViewSet, basename="blog-post")
router.register("dashboard/blog/posts", DashboardPostViewSet, basename="dashboard-blog-post")

urlpatterns = [path("", include(router.urls))]
