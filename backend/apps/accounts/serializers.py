from allauth.mfa.models import Authenticator
from rest_framework import serializers

from .models import User


class MeSerializer(serializers.ModelSerializer[User]):
    full_name = serializers.CharField(source="get_full_name")
    mfa_enabled = serializers.SerializerMethodField()

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
        ]

    def get_mfa_enabled(self, user: User) -> bool:
        return Authenticator.objects.filter(user=user, type=Authenticator.Type.TOTP).exists()
