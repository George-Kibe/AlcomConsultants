import re
from typing import Any

from allauth.account.models import EmailAddress
from allauth.mfa.models import Authenticator
from django.utils import timezone
from rest_framework import serializers

from .models import User

PHONE = re.compile(r"^\+?[\d\s()-]{7,20}$")


class MeSerializer(serializers.ModelSerializer[User]):
    """The signed-in user. Visitors may change their name, phone and email preferences."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    mfa_enabled = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    can_comment = serializers.SerializerMethodField()
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "is_staff",
            "mfa_enabled",
            "email_verified",
            "can_comment",
            "has_password",
            "marketing_opt_in",
            "marketing_opt_in_at",
            "date_joined",
        ]
        read_only_fields = ["email", "is_staff", "marketing_opt_in_at", "date_joined"]
        extra_kwargs = {
            "first_name": {"max_length": 60},
            "last_name": {"max_length": 60},
        }

    def get_mfa_enabled(self, user: User) -> bool:
        return Authenticator.objects.filter(user=user, type=Authenticator.Type.TOTP).exists()

    def get_email_verified(self, user: User) -> bool:
        return EmailAddress.objects.filter(user=user, verified=True).exists()

    def get_can_comment(self, user: User) -> bool:
        return can_comment(user)

    def get_has_password(self, user: User) -> bool:
        """False for Google-only accounts (no password to change or confirm with)."""
        return user.has_usable_password()

    def validate_first_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter your first name.")
        return value

    def validate_phone(self, value: str) -> str:
        value = value.strip()
        if value and not PHONE.match(value):
            raise serializers.ValidationError("Enter a phone number, e.g. 0712 345 678.")
        return value

    def update(self, user: User, validated_data: dict[str, Any]) -> User:
        opt_in = validated_data.get("marketing_opt_in")
        if opt_in is not None and opt_in != user.marketing_opt_in:
            validated_data["marketing_opt_in_at"] = timezone.now() if opt_in else None
        return super().update(user, validated_data)


class DeleteAccountSerializer(serializers.Serializer[Any]):
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    confirm = serializers.CharField(
        required=False, allow_blank=True, help_text='"DELETE", for accounts without a password.'
    )


def can_comment(user: User) -> bool:
    """Staff, and readers with a verified email address (Google accounts are verified)."""
    if not user.is_active:
        return False
    return user.is_staff or EmailAddress.objects.filter(user=user, verified=True).exists()
