"""A signed-in visitor's favourites and saved searches."""

from typing import Any, cast

from django.db import IntegrityError, transaction
from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.media import MediaKind
from apps.listings.models import VISIBLE_STATUSES, Property, PropertyMedia
from apps.listings.serializers import PropertyListSerializer

from . import search
from .alerts import unsubscribe_user
from .models import MAX_FAVOURITES, MAX_SAVED_SEARCHES, Favourite, SavedSearch


def _user(request: Request) -> User:
    """The signed-in user (every view here requires IsAuthenticated)."""
    return cast(User, request.user)


class FavouriteViewSet(viewsets.GenericViewSet[Property]):
    """Saved properties. Sold and let listings stay (marked); withdrawn ones disappear."""

    permission_classes = [IsAuthenticated]
    serializer_class = PropertyListSerializer
    pagination_class = None
    lookup_field = "slug"
    filter_backends: list[Any] = []

    def get_queryset(self) -> QuerySet[Property]:
        return Property.objects.visible().filter(favourited_by__user=_user(self.request))

    def list(self, request: Request) -> Response:
        """Most recently saved first."""
        images = PropertyMedia.objects.filter(kind=MediaKind.IMAGE).order_by("order", "id")
        favourites = (
            Favourite.objects.filter(user=_user(request), property__status__in=VISIBLE_STATUSES)
            .select_related(
                "property__property_type", "property__area__county", "property__neighbourhood"
            )
            .prefetch_related(Prefetch("property__media", queryset=images, to_attr="images"))
        )
        properties = [f.property for f in favourites]
        return Response(PropertyListSerializer(properties, many=True).data)

    @extend_schema(responses=serializers.ListSerializer(child=serializers.CharField()))
    def slugs(self, request: Request) -> Response:
        """Slugs of every saved property (to show filled hearts on any page)."""
        return Response(list(self.get_queryset().values_list("slug", flat=True)))

    @extend_schema(request=None, responses={204: None})
    def add(self, request: Request, slug: str) -> Response:
        prop = get_object_or_404(Property.objects.visible(), slug=slug)
        user = _user(request)
        if user.favourites.count() >= MAX_FAVOURITES:
            return Response(
                {"detail": f"You can save up to {MAX_FAVOURITES} properties."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        Favourite.objects.get_or_create(user=user, property=prop)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=None, responses={204: None})
    def remove(self, request: Request, slug: str) -> Response:
        Favourite.objects.filter(user=_user(request), property__slug=slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedSearchSerializer(serializers.ModelSerializer[SavedSearch]):
    path = serializers.CharField(read_only=True, help_text="/properties?… for this search")
    match_count = serializers.SerializerMethodField()

    class Meta:
        model = SavedSearch
        fields = ["uuid", "name", "query", "path", "alerts", "match_count", "created_at"]
        read_only_fields = ["uuid", "created_at"]
        extra_kwargs = {"name": {"required": False}}

    def get_match_count(self, saved: SavedSearch) -> int:
        return search.matches(saved.query).count()

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the search a name.")
        return value

    def validate_query(self, value: str) -> str:
        try:
            return search.normalise(value)
        except search.InvalidSearch as e:
            raise serializers.ValidationError(f"Not a valid property search ({e}).") from e

    def update(self, saved: SavedSearch, validated_data: dict[str, Any]) -> SavedSearch:
        validated_data.pop("query", None)  # a different search is a new saved search
        return super().update(saved, validated_data)


class SavedSearchViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet[SavedSearch],
):
    """Saved searches. Saving the same search twice returns the existing one."""

    permission_classes = [IsAuthenticated]
    serializer_class = SavedSearchSerializer
    pagination_class = None
    lookup_field = "uuid"
    filter_backends: list[Any] = []
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[SavedSearch]:
        if getattr(self, "swagger_fake_view", False):  # OpenAPI schema generation
            return SavedSearch.objects.none()
        return SavedSearch.objects.filter(user=_user(self.request))

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data["query"]
        if existing := self.get_queryset().filter(query=query).first():
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)
        if self.get_queryset().count() >= MAX_SAVED_SEARCHES:
            return Response(
                {"detail": f"You can save up to {MAX_SAVED_SEARCHES} searches. Delete one first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = serializer.validated_data.get("name") or search.describe(query)
        try:
            with transaction.atomic():
                saved = serializer.save(user=request.user, name=name)
        except IntegrityError:  # saved twice at the same moment
            saved = self.get_queryset().get(query=query)
        return Response(self.get_serializer(saved).data, status=status.HTTP_201_CREATED)


class UnsubscribeView(APIView):
    """Turn off saved-search emails from the link in an email (no sign-in needed).

    Also the RFC 8058 one-click target of the List-Unsubscribe header (token in the URL).
    """

    permission_classes = [AllowAny]
    authentication_classes: list[Any] = []

    @extend_schema(
        request=inline_serializer("UnsubscribeRequest", {"token": serializers.CharField()}),
        responses={
            200: inline_serializer("UnsubscribeResult", {"email": serializers.EmailField()})
        },
    )
    def post(self, request: Request) -> Response:
        token = request.query_params.get("token") or (
            request.data.get("token") if isinstance(request.data, dict) else None
        )
        user = unsubscribe_user(str(token or ""))
        if user is None:
            return Response(
                {"detail": "This link is invalid. Manage emails from your account instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"email": user.email})
