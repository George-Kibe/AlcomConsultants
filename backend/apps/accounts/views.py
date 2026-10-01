from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import MeSerializer


class MeView(generics.RetrieveAPIView[User]):
    """The signed-in user (403 when signed out)."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self) -> User:
        return self.request.user  # type: ignore[return-value]
