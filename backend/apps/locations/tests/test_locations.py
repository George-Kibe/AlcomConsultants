import pytest
from django.urls import reverse

from apps.locations.models import Area, County

pytestmark = pytest.mark.django_db


def test_all_47_counties_are_seeded_with_official_codes():
    assert County.objects.filter(code__lte=47).count() == 47
    assert County.objects.get(code=47).name == "Nairobi"
    assert County.objects.get(code=1).name == "Mombasa"


def test_popular_areas_are_seeded_with_map_centres():
    kilimani = Area.objects.select_related("county").get(slug="kilimani")
    assert kilimani.county.name == "Nairobi"
    assert kilimani.location is not None
    assert str(kilimani) == "Kilimani, Nairobi"


def test_county_tree(api):
    data = api.get(reverse("locations")).json()
    nairobi = next(c for c in data if c["slug"] == "nairobi")
    assert {"name": "Westlands", "slug": "westlands"} in nairobi["areas"]


@pytest.mark.parametrize(
    ("q", "expected_kind", "expected_text"),
    [("kili", "area", "Kilimani, Nairobi"), ("Nairo", "county", "Nairobi County")],
)
def test_location_search(api, q, expected_kind, expected_text):
    results = api.get(reverse("location-search"), {"q": q}).json()
    assert {"kind": expected_kind, "text": expected_text} in [
        {"kind": r["kind"], "text": r["text"]} for r in results
    ]


def test_location_search_finds_neighbourhoods(api):
    from apps.listings.tests.factories import NeighbourhoodFactory

    NeighbourhoodFactory(name="Yaya Centre", slug="yaya-centre")
    results = api.get(reverse("location-search"), {"q": "yaya"}).json()
    assert results[0]["kind"] == "neighbourhood"
    assert results[0]["neighbourhood"] == "yaya-centre"


def test_location_search_needs_two_letters(api):
    assert api.get(reverse("location-search"), {"q": "k"}).json() == []
