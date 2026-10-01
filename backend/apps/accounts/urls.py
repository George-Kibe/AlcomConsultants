from django.urls import path

from .views import DeleteAccountView, ExportView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/export/", ExportView.as_view(), name="me-export"),
    path("me/delete/", DeleteAccountView.as_view(), name="me-delete"),
]
