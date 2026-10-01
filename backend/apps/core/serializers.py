from rest_framework import serializers

from .media import BaseMedia


class MediaSerializer(serializers.Serializer[BaseMedia]):
    """Cloudinary asset. Clients build sized URLs from `public_id`; `url` is the original."""

    public_id = serializers.CharField()
    kind = serializers.CharField()
    resource_type = serializers.CharField()
    url = serializers.CharField()
    width = serializers.IntegerField(allow_null=True)
    height = serializers.IntegerField(allow_null=True)
    alt_text = serializers.CharField()
    caption = serializers.CharField()
