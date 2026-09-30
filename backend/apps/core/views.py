import logging

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthView(APIView):
    """Liveness/readiness probe used by Docker, Nginx upstream checks and uptime monitors."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    @extend_schema(
        responses=inline_serializer(
            "Health",
            {
                "status": serializers.CharField(),
                "database": serializers.BooleanField(),
                "cache": serializers.BooleanField(),
            },
        )
    )
    def get(self, request: Request) -> Response:
        checks = {"database": self._database_ok(), "cache": self._cache_ok()}
        healthy = all(checks.values())
        return Response(
            {"status": "ok" if healthy else "degraded", **checks},
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    @staticmethod
    def _database_ok() -> bool:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            logger.exception("Health check: database unavailable")
            return False
        return True

    @staticmethod
    def _cache_ok() -> bool:
        try:
            cache.set("health:ping", "pong", timeout=5)
            return cache.get("health:ping") == "pong"
        except Exception:
            logger.exception("Health check: cache unavailable")
            return False
