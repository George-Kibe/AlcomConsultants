"""Public enquiry forms: listing, contact, valuation and property management."""

import logging
import re
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.serializers import PHONE
from apps.listings.models import Property

from . import spam, tasks
from .models import CONSENT_TEXT, CONSENT_VERSION, Enquiry, Kind, Purpose

logger = logging.getLogger(__name__)
URL = re.compile(r"https?://|www\.", re.IGNORECASE)
MAX_LINKS = 2


class _PerIP(SimpleRateThrottle):
    def get_cache_key(self, request: Request, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class EnquiryBurstThrottle(_PerIP):
    scope = "enquiries_burst"


class EnquiryDailyThrottle(_PerIP):
    scope = "enquiries_daily"


class EnquirySerializer(serializers.ModelSerializer[Enquiry]):
    property = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Property.objects.visible(),
        required=False,
        allow_null=True,
        help_text="Listing slug (property enquiries).",
    )
    consent = serializers.BooleanField(write_only=True)
    form_token = serializers.CharField(write_only=True)
    turnstile_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    website = serializers.CharField(
        write_only=True, required=False, allow_blank=True, help_text="Leave empty (honeypot)."
    )

    class Meta:
        model = Enquiry
        fields = [
            "reference",
            "kind",
            "name",
            "email",
            "phone",
            "message",
            "property",
            "property_type",
            "location",
            "purpose",
            "units",
            "source_path",
            "consent",
            "form_token",
            "turnstile_token",
            "website",
        ]
        read_only_fields = ["reference"]

    def validate_name(self, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError("Enter your name.")
        if URL.search(value):
            raise serializers.ValidationError("Enter your name without links.")
        return value

    def validate_phone(self, value: str) -> str:
        value = value.strip()
        if value and not PHONE.match(value):
            raise serializers.ValidationError("Enter a phone number, e.g. 0712 345 678.")
        return value

    def validate_message(self, value: str) -> str:
        value = value.strip()
        if len(URL.findall(value)) > MAX_LINKS:
            raise serializers.ValidationError(f"Please include at most {MAX_LINKS} links.")
        return value

    def validate_consent(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("Please agree so we can reply to you.")
        return value

    def validate_source_path(self, value: str) -> str:
        return value if value.startswith("/") else ""

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        kind = attrs["kind"]
        errors: dict[str, str] = {}
        if kind == Kind.LISTING and not attrs.get("property"):
            errors["property"] = "Choose the property you're asking about."
        if kind in (Kind.VALUATION, Kind.MANAGEMENT) and not attrs.get("location", "").strip():
            errors["location"] = "Tell us where the property is."
        if kind == Kind.CONTACT and len(attrs.get("message", "")) < 10:
            errors["message"] = "Tell us a little about what you need."
        if errors:
            raise serializers.ValidationError(errors)
        if kind != Kind.LISTING:
            attrs["property"] = None
        if kind != Kind.VALUATION:
            attrs["purpose"] = ""
        if kind != Kind.MANAGEMENT:
            attrs["units"] = None
        return attrs


class EnquiryFormView(APIView):
    """What a form needs before it's shown: a fresh form token and the Turnstile key."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            "EnquiryForm",
            {
                "form_token": serializers.CharField(),
                "turnstile_site_key": serializers.CharField(),
                "consent_text": serializers.CharField(),
                "purposes": serializers.ListField(child=serializers.DictField()),
            },
        )
    )
    def get(self, request: Request) -> Response:
        response = Response(
            {
                "form_token": spam.form_token(),
                "turnstile_site_key": settings.TURNSTILE_SITE_KEY
                if spam.turnstile_enabled()
                else "",
                "consent_text": CONSENT_TEXT,
                "purposes": [{"value": v, "label": str(label)} for v, label in Purpose.choices],
            }
        )
        response["Cache-Control"] = "no-store"
        return response


class EnquiryCreateView(APIView):
    """Send an enquiry. The office is emailed and the visitor gets a confirmation."""

    permission_classes = [AllowAny]
    throttle_classes = [EnquiryBurstThrottle, EnquiryDailyThrottle]

    @extend_schema(
        request=EnquirySerializer,
        responses={
            201: inline_serializer("EnquiryReceipt", {"reference": serializers.CharField()})
        },
    )
    def post(self, request: Request) -> Response:
        data = request.data if isinstance(request.data, dict) else {}
        if str(data.get("website") or "").strip():
            logger.info("Enquiry honeypot filled; dropped")
            return Response({"reference": ""}, status=status.HTTP_201_CREATED)
        # Field errors first, so a person sees what to fix before any timing check.
        serializer = EnquirySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        problem = spam.token_problem(str(data.get("form_token") or ""))
        if problem == "too fast":  # a person can resend; bots rarely do
            return Response(
                {"detail": "Please wait a moment, then send the form again.", "code": "too_fast"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if problem:
            return Response(
                {
                    "detail": "This form has expired. Please send it again.",
                    "code": "expired",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        check = spam.verify_turnstile(
            serializer.validated_data.pop("turnstile_token", ""),
            EnquiryBurstThrottle().get_ident(request),
        )
        if check == spam.Check.FAILED:
            return Response(
                {
                    "detail": "Please complete the security check and send the form again.",
                    "code": "security_check",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        for key in ("consent", "form_token", "website"):
            serializer.validated_data.pop(key, None)
        prop = serializer.validated_data.get("property")
        user = request.user if request.user.is_authenticated else None
        with transaction.atomic():
            enquiry = serializer.save(
                user=user,
                consent_at=timezone.now(),
                consent_version=CONSENT_VERSION,
                spam_check=str(check),
                property_label=f"{prop.reference} {prop.title}" if prop else "",
            )
            transaction.on_commit(lambda: tasks.notify_staff.delay(enquiry.pk))
            transaction.on_commit(lambda: tasks.acknowledge.delay(enquiry.pk))
        return Response({"reference": enquiry.reference}, status=status.HTTP_201_CREATED)
