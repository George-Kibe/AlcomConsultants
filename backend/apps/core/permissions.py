from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request


class IsStaff(BasePermission):
    """Active staff members only (the dashboard)."""

    message = "Staff access only."

    def has_permission(self, request: Request, view: Any) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)
