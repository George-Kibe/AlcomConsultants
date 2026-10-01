from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .dashboard import DashboardEnquiryViewSet
from .views import EnquiryCreateView, EnquiryFormView

router = SimpleRouter(trailing_slash=True)
router.register("dashboard/enquiries", DashboardEnquiryViewSet, basename="dashboard-enquiry")

urlpatterns = [
    path("", include(router.urls)),
    path("enquiries/", EnquiryCreateView.as_view(), name="enquiry-create"),
    path("enquiries/form/", EnquiryFormView.as_view(), name="enquiry-form"),
]
