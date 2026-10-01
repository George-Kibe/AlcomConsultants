from typing import Any

from rest_framework import serializers

from .models import Area, County


class CountyRefSerializer(serializers.ModelSerializer[County]):
    class Meta:
        model = County
        fields = ["name", "slug"]


class AreaSerializer(serializers.ModelSerializer[Area]):
    class Meta:
        model = Area
        fields = ["name", "slug"]


class CountyTreeSerializer(serializers.ModelSerializer[County]):
    areas = AreaSerializer(many=True, read_only=True)

    class Meta:
        model = County
        fields = ["code", "name", "slug", "areas"]


class LocationMatchSerializer(serializers.Serializer[Any]):
    """One autocomplete suggestion; `text` is what the user sees."""

    kind = serializers.ChoiceField(choices=["county", "area", "neighbourhood"])
    text = serializers.CharField()
    county = serializers.CharField()
    area = serializers.CharField(allow_blank=True)
    neighbourhood = serializers.CharField(allow_blank=True)
