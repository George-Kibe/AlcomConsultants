from django.urls import include, path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter(trailing_slash=True)
router.register("dashboard/content/team", views.DashboardTeamViewSet, basename="dashboard-team")
router.register(
    "dashboard/content/testimonials",
    views.DashboardTestimonialViewSet,
    basename="dashboard-testimonial",
)
router.register("dashboard/content/faqs", views.DashboardFaqViewSet, basename="dashboard-faq")
router.register("dashboard/content/jobs", views.DashboardJobViewSet, basename="dashboard-job")

urlpatterns = [
    path("", include(router.urls)),
    path("content/team/", views.TeamListView.as_view(), name="team-list"),
    path("content/testimonials/", views.TestimonialListView.as_view(), name="testimonial-list"),
    path("content/faqs/", views.FaqListView.as_view(), name="faq-list"),
    path("careers/", views.JobListView.as_view(), name="job-list"),
    path("careers/<slug:slug>/", views.JobDetailView.as_view(), name="job-detail"),
]
