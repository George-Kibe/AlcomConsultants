from allauth.account.models import EmailAddress
from allauth.mfa.models import Authenticator
from rest_framework import serializers

from .models import User


class MeSerializer(serializers.ModelSerializer[User]):
    full_name = serializers.CharField(source="get_full_name")
    mfa_enabled = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    can_comment = serializers.SerializerMethodField()

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
        ]

    def get_mfa_enabled(self, user: User) -> bool:
        return Authenticator.objects.filter(user=user, type=Authenticator.Type.TOTP).exists()

    def get_email_verified(self, user: User) -> bool:
        return EmailAddress.objects.filter(user=user, verified=True).exists()

    def get_can_comment(self, user: User) -> bool:
        return can_comment(user)


def can_comment(user: User) -> bool:
    """Staff, and readers with a verified email address (Google accounts are verified)."""
    if not user.is_active:
        return False
    return user.is_staff or EmailAddress.objects.filter(user=user, verified=True).exists()
