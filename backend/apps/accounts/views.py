import json
from typing import Any

from django.contrib.auth import logout
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User
from .serializers import DeleteAccountSerializer, MeSerializer


class MeView(generics.RetrieveUpdateAPIView[User]):
    """The signed-in user (403 when signed out). PATCH updates the visitor's own details."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> User:
        return self.request.user  # type: ignore[return-value]


def export_data(user: User) -> dict[str, Any]:
    """Everything the website holds about a visitor (Data Protection Act: right of access)."""
    from allauth.account.models import EmailAddress
    from allauth.socialaccount.models import SocialAccount

    from apps.blog.models import Comment
    from apps.enquiries.models import Enquiry
    from apps.saved.models import Favourite, SavedSearch

    def when(value: Any) -> str | None:
        return value.isoformat() if value else None

    return {
        "exported_at": when(timezone.now()),
        "account": {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "date_joined": when(user.date_joined),
            "last_login": when(user.last_login),
            "email_addresses": [
                {"email": e.email, "verified": e.verified, "primary": e.primary}
                for e in EmailAddress.objects.filter(user=user)
            ],
            "signed_in_with_google": SocialAccount.objects.filter(
                user=user, provider="google"
            ).exists(),
        },
        "consent": {
            "news_and_offers_by_email": user.marketing_opt_in,
            "opted_in_at": when(user.marketing_opt_in_at),
        },
        "favourites": [
            {
                "reference": f.property.reference,
                "title": f.property.title,
                "saved_at": when(f.created_at),
            }
            for f in Favourite.objects.filter(user=user).select_related("property")
        ],
        "saved_searches": [
            {
                "name": s.name,
                "search": s.path,
                "daily_email": s.alerts,
                "saved_at": when(s.created_at),
            }
            for s in SavedSearch.objects.filter(user=user)
        ],
        "blog_comments": [
            {
                "article": c.post.title,
                "comment": c.body,
                "posted_at": when(c.created_at),
                "hidden_by_moderator": c.is_hidden,
            }
            for c in Comment.objects.filter(author=user).select_related("post")
        ],
        "enquiries": [
            {
                "reference": e.reference,
                "type": e.get_kind_display(),
                "name": e.name,
                "email": e.email,
                "phone": e.phone,
                "message": e.message,
                "about": e.property_label or e.location,
                "sent_at": when(e.created_at),
                "consent_given_at": when(e.consent_at),
            }
            for e in Enquiry.objects.filter(user=user)
        ],
    }


class ExportView(APIView):
    """Download a copy of your data (JSON)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={(200, "application/json"): OpenApiTypes.OBJECT})
    def get(self, request: Request) -> HttpResponse:
        data = export_data(request.user)  # type: ignore[arg-type]
        response = HttpResponse(
            json.dumps(data, indent=2, ensure_ascii=False), content_type="application/json"
        )
        stamp = timezone.localdate().isoformat()
        response["Content-Disposition"] = f'attachment; filename="alcom-account-{stamp}.json"'
        return response


class DeleteAccountView(APIView):
    """Delete your account. Comments stay on the blog as "Former reader" and enquiries stay
    with the office (no longer linked to the account); everything else (profile, favourites,
    saved searches, sign-in methods) is removed."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account_delete"

    @extend_schema(request=DeleteAccountSerializer, responses={204: None})
    def post(self, request: Request) -> Response:
        user: User = request.user  # type: ignore[assignment]
        if user.is_staff:
            return Response(
                {"detail": "Staff accounts are closed by an administrator."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = DeleteAccountSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        if user.has_usable_password():
            if not user.check_password(payload.validated_data.get("password", "")):
                return Response(
                    {"password": ["That password isn't right."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif payload.validated_data.get("confirm") != "DELETE":
            return Response(
                {"confirm": ['Type "DELETE" to confirm.']}, status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            logout(request._request)
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
