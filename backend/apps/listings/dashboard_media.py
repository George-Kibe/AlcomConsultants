"""Staff endpoints for listing photos: signed direct uploads to Cloudinary."""

from typing import Any

from django.db import transaction
from django.db.models import Max, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core import media
from apps.core.media import MediaKind
from apps.core.permissions import IsStaff

from .models import Property, PropertyMedia

UPLOAD_TARGETS = {"properties", "projects"}


class UploadSignatureView(APIView):
    """Signed parameters for one direct browser → Cloudinary upload."""

    permission_classes = [IsStaff]

    @extend_schema(
        request=inline_serializer(
            "UploadSignatureRequest",
            {"target": serializers.ChoiceField(choices=sorted(UPLOAD_TARGETS))},
        ),
        responses=inline_serializer(
            "UploadSignature",
            {
                "upload_url": serializers.URLField(),
                "api_key": serializers.CharField(),
                "cloud_name": serializers.CharField(),
                "timestamp": serializers.IntegerField(),
                "folder": serializers.CharField(),
                "allowed_formats": serializers.CharField(),
                "signature": serializers.CharField(),
                "max_bytes": serializers.IntegerField(),
            },
        ),
    )
    def post(self, request: Request) -> Response:
        target = request.data.get("target") if isinstance(request.data, dict) else None
        if target not in UPLOAD_TARGETS:
            return Response({"target": ["Unknown upload target."]}, status=400)
        return Response(media.signed_upload_params(target))


class PropertyMediaSerializer(serializers.ModelSerializer[PropertyMedia]):
    url = serializers.CharField(read_only=True)

    class Meta:
        model = PropertyMedia
        fields = [
            "id",
            "public_id",
            "kind",
            "url",
            "width",
            "height",
            "bytes",
            "format",
            "alt_text",
            "caption",
            "order",
        ]
        read_only_fields = ["id", "public_id", "url", "width", "height", "bytes", "format", "order"]


class AttachUploadSerializer(serializers.Serializer[Any]):
    """The upload result Cloudinary returned to the browser."""

    public_id = serializers.CharField(max_length=255)
    version = serializers.IntegerField()
    signature = serializers.CharField()
    width = serializers.IntegerField(required=False, allow_null=True)
    height = serializers.IntegerField(required=False, allow_null=True)
    bytes = serializers.IntegerField(required=False, allow_null=True)
    format = serializers.CharField(required=False, allow_blank=True)
    kind = serializers.ChoiceField(
        choices=[MediaKind.IMAGE, MediaKind.FLOOR_PLAN], default=MediaKind.IMAGE
    )
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=200)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not media.is_authentic_upload(attrs["public_id"], attrs["version"], attrs["signature"]):
            raise serializers.ValidationError("This upload could not be verified.")
        prefix = f"{media.settings.CLOUDINARY_FOLDER}/properties/"
        if not attrs["public_id"].startswith(prefix):
            raise serializers.ValidationError("Upload is not in the listings folder.")
        return attrs


class ReorderSerializer(serializers.Serializer[Any]):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class PropertyMediaViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet[PropertyMedia],
):
    """Photos and floor plans of one listing, in display order (first = cover)."""

    permission_classes = [IsStaff]
    serializer_class = PropertyMediaSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_property(self) -> Property:
        return get_object_or_404(Property, uuid=self.kwargs["property_uuid"])

    def get_queryset(self) -> QuerySet[PropertyMedia]:
        if getattr(self, "swagger_fake_view", False):  # OpenAPI schema generation
            return PropertyMedia.objects.none()
        return PropertyMedia.objects.filter(property__uuid=self.kwargs["property_uuid"]).order_by(
            "order", "id"
        )

    @extend_schema(request=AttachUploadSerializer, responses={201: PropertyMediaSerializer})
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        prop = self.get_property()
        payload = AttachUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        with transaction.atomic():
            last = prop.media.aggregate(m=Max("order"))["m"]
            item = PropertyMedia.objects.create(
                property=prop,
                public_id=data["public_id"],
                kind=data["kind"],
                width=data.get("width"),
                height=data.get("height"),
                bytes=data.get("bytes"),
                format=data.get("format", ""),
                alt_text=data.get("alt_text", ""),
                order=0 if last is None else last + 1,
            )
            prop.updated_by = request.user  # type: ignore[assignment]
            prop.save(update_fields=["updated_by", "updated_at"])
        return Response(PropertyMediaSerializer(item).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=ReorderSerializer, responses=PropertyMediaSerializer(many=True))
    @action(detail=False, methods=["post"])
    def reorder(self, request: Request, property_uuid: str) -> Response:
        payload = ReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ids = payload.validated_data["ids"]
        items = {m.id: m for m in self.get_queryset()}
        if sorted(ids) != sorted(items):
            return Response({"ids": ["Send every photo of this listing exactly once."]}, status=400)
        with transaction.atomic():
            for position, media_id in enumerate(ids):
                items[media_id].order = position
            PropertyMedia.objects.bulk_update(items.values(), ["order"])
        return Response(PropertyMediaSerializer(self.get_queryset(), many=True).data)
