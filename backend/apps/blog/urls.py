from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .comments import CommentViewSet, DashboardCommentViewSet
from .dashboard import DashboardPostViewSet
from .views import PostViewSet

router = SimpleRouter(trailing_slash=True)
router.register("blog/posts", PostViewSet, basename="blog-post")
router.register(
    r"blog/posts/(?P<post_slug>[-\w]+)/comments", CommentViewSet, basename="blog-comment"
)
router.register("dashboard/blog/posts", DashboardPostViewSet, basename="dashboard-blog-post")
router.register(
    "dashboard/blog/comments", DashboardCommentViewSet, basename="dashboard-blog-comment"
)

urlpatterns = [path("", include(router.urls))]
