from io import StringIO
from unittest import mock

import pytest
from django.contrib.gis.geos import Point
from django.core.management import CommandError, call_command
from django.urls import reverse

from apps.blog.models import Post
from apps.core.signals import is_uploaded_asset
from apps.listings import nearby
from apps.listings.models import DealType, Property, Status

from .factories import AreaFactory, PropertyFactory, PropertyMediaFactory, PropertyTypeFactory

pytestmark = pytest.mark.django_db


def test_bbox_filter(api):
    inside = PropertyFactory(location=Point(36.78, -1.29, srid=4326))
    PropertyFactory(location=Point(39.70, -4.03, srid=4326))  # Mombasa
    by_area = PropertyFactory(location=None, area=AreaFactory(location=Point(36.80, -1.28)))
    refs = {
        p["reference"]
        for p in api.get(reverse("property-list"), {"bbox": "36.7,-1.35,36.9,-1.2"}).json()[
            "results"
        ]
    }
    assert refs == {inside.reference, by_area.reference}
    assert api.get(reverse("property-list"), {"bbox": "nonsense"}).json()["count"] == 0


def test_map_points(api):
    a = PropertyFactory(location=Point(36.785612, -1.290634, srid=4326))
    PropertyMediaFactory(property=a)
    PropertyFactory(status=Status.DRAFT)
    no_point = PropertyFactory(location=None, area=AreaFactory(location=None))
    points = api.get(reverse("property-map"), {"deal": "sale"}).json()
    assert [p["reference"] for p in points] == [a.reference]
    assert points[0]["lat"] == -1.29 and points[0]["cover_image"].startswith("alcom/test/")
    assert no_point.reference not in {p["reference"] for p in points}


def test_similar(api):
    area, flat, house = AreaFactory(), PropertyTypeFactory(), PropertyTypeFactory()
    me = PropertyFactory(area=area, property_type=flat, price=10_000_000)
    best = PropertyFactory(area=area, property_type=flat, price=11_000_000)
    same_area = PropertyFactory(area=area, property_type=house, price=10_000_000)
    same_type = PropertyFactory(property_type=flat, price=10_000_000)
    PropertyFactory(area=area, property_type=flat, deal_type=DealType.RENT, price=100_000)
    PropertyFactory(area=area, property_type=flat, status=Status.DRAFT)
    refs = [p["reference"] for p in api.get(reverse("property-similar", args=[me.slug])).json()]
    assert refs[:3] == [best.reference, same_area.reference, same_type.reference]


def test_similar_without_price(api):
    me = PropertyFactory(price=None, price_on_request=True)
    other = PropertyFactory(property_type=me.property_type)
    refs = [p["reference"] for p in api.get(reverse("property-similar", args=[me.slug])).json()]
    assert refs == [other.reference]


OVERPASS = {
    "elements": [
        {
            "type": "node",
            "lat": -1.2905,
            "lon": 36.7860,
            "tags": {"amenity": "school", "name": "Hillcrest"},
        },
        {
            "type": "way",
            "center": {"lat": -1.30, "lon": 36.79},
            "tags": {"amenity": "hospital", "name": "Nairobi Hospital"},
        },
        {
            "type": "node",
            "lat": -1.2950,
            "lon": 36.7900,
            "tags": {"shop": "mall", "name": "Yaya Centre"},
        },
        {
            "type": "node",
            "lat": -1.2950,
            "lon": 36.7900,
            "tags": {"shop": "mall", "name": "Yaya Centre"},
        },
        {
            "type": "node",
            "lat": -1.2950,
            "lon": 36.7900,
            "tags": {"shop": "bakery", "name": "Ignored"},
        },
        {"type": "node", "lat": -1.2950, "lon": 36.7900, "tags": {"amenity": "school"}},
    ]
}


def test_nearby_groups_and_caches(api):
    prop = PropertyFactory(location=Point(36.786, -1.290, srid=4326), show_exact_location=True)
    with mock.patch.object(nearby, "_fetch", return_value=OVERPASS) as fetch:
        data = api.get(reverse("property-nearby", args=[prop.slug])).json()
        api.get(reverse("property-nearby", args=[prop.slug]))
    assert fetch.call_count == 1  # cached
    groups = {g["category"]: g["places"] for g in data}
    assert list(groups) == ["Schools", "Health", "Shopping"]
    school = groups["Schools"][0]
    assert (school["name"], school["type"]) == ("Hillcrest", "school")
    assert 50 <= school["distance_m"] <= 60  # 0.0005° of latitude ≈ 56 m
    assert len(groups["Shopping"]) == 1  # duplicate name removed


def test_nearby_failure_returns_empty(api):
    prop = PropertyFactory(location=Point(37.0, -1.0, srid=4326))
    with mock.patch.object(nearby, "_fetch", side_effect=TimeoutError):
        assert api.get(reverse("property-nearby", args=[prop.slug])).json() == []


def test_nearby_without_location(api):
    prop = PropertyFactory(location=None, area=AreaFactory(location=None))
    assert api.get(reverse("property-nearby", args=[prop.slug])).json() == []


def test_overpass_query_and_distance():
    query = nearby._query(-1.29, 36.78)
    assert (
        "around:1500,-1.29,36.78" in query and '"amenity"~"^(hospital|clinic|pharmacy)$"' in query
    )
    assert nearby.distance_m(-1.29, 36.78, -1.29, 36.79) == 1112


def test_seed_demo_listings(settings):
    settings.DEBUG = True
    out = StringIO()
    call_command("seed_demo_listings", stdout=out)
    assert "Created 26 demo listings (drafts without photos: 2) and 5 demo articles" in (
        out.getvalue()
    )
    assert Property.objects.listed().count() == 23  # one more is let, two are drafts
    assert Property.objects.filter(is_featured=True).count() == 6
    assert Property.objects.filter(status="draft", media__isnull=True).count() == 2
    assert set(Property.objects.values_list("furnishing", flat=True)) == {
        "", "furnished", "semi", "unfurnished"
    }  # fmt: skip
    assert Post.objects.published().count() == 5
    call_command("seed_demo_listings", stdout=out)  # idempotent
    assert (Property.objects.count(), Post.objects.count()) == (26, 5)
    with mock.patch("apps.core.tasks.delete_cloudinary_asset.delay") as destroy:
        call_command("seed_demo_listings", "--clear", stdout=out)
    assert (Property.objects.count(), Post.objects.count()) == (0, 0)
    destroy.assert_not_called()  # shared site images are never deleted


def test_seed_refuses_in_production():
    with pytest.raises(CommandError, match="outside DEBUG"):
        call_command("seed_demo_listings")


@pytest.mark.parametrize(
    ("public_id", "deletable"),
    [
        ("alcom/test/properties/abc", True),
        ("alcom/test/projects/abc", True),
        ("alcom_images/site/hero/01-nairobi-kicc", False),
        ("alcom/test/site/x", False),
    ],
)
def test_only_uploads_are_deleted_from_cloudinary(public_id, deletable):
    assert is_uploaded_asset(public_id) is deletable


def test_overpass_falls_back_to_mirror():
    calls = []

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self):
            return b'{"elements": []}'

    def urlopen(request, timeout):
        calls.append(request.full_url)
        if len(calls) == 1:
            raise TimeoutError("busy")
        return Response()

    with mock.patch("urllib.request.urlopen", side_effect=urlopen):
        assert nearby._fetch(-1.29, 36.78) == {"elements": []}
    assert calls == nearby.OVERPASS_URLS


def test_overpass_all_servers_failing_raises():
    with (
        mock.patch("urllib.request.urlopen", side_effect=TimeoutError("busy")),
        pytest.raises(TimeoutError),
    ):
        nearby._fetch(-1.29, 36.78)
