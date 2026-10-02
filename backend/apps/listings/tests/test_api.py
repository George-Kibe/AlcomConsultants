import pytest
from django.contrib.gis.geos import Point
from django.urls import reverse

from apps.core.media import MediaKind
from apps.listings.models import DealType, Furnishing, Status

from .factories import (
    AmenityFactory,
    AreaFactory,
    NeighbourhoodFactory,
    ProjectFactory,
    PropertyFactory,
    PropertyMediaFactory,
    PropertyTypeFactory,
)

pytestmark = pytest.mark.django_db
LIST = reverse("property-list")


def refs(response):
    assert response.status_code == 200, response.content
    return [p["reference"] for p in response.json()["results"]]


def test_list_shows_only_active_listings(api):
    live = PropertyFactory(status=Status.PUBLISHED)
    offer = PropertyFactory(status=Status.UNDER_OFFER)
    for status in (Status.DRAFT, Status.SOLD, Status.LET, Status.ARCHIVED):
        PropertyFactory(status=status)
    assert set(refs(api.get(LIST))) == {live.reference, offer.reference}


def test_list_item_shape(api):
    prop = PropertyFactory(neighbourhood=None)
    PropertyMediaFactory(property=prop, kind=MediaKind.FLOOR_PLAN, order=0)
    cover = PropertyMediaFactory(property=prop, order=1, alt_text="Front view")
    item = api.get(LIST).json()["results"][0]
    assert item["slug"] == prop.slug
    assert item["property_type"]["slug"] == prop.property_type.slug
    assert item["location"]["area"] == prop.area.name
    assert item["location"]["county_slug"] == prop.area.county.slug
    assert item["location"]["neighbourhood"] == ""
    assert item["cover_image"]["public_id"] == cover.public_id  # floor plans aren't covers
    assert item["cover_image"]["alt_text"] == "Front view"
    assert "test-cloud" in item["cover_image"]["url"]


def test_list_without_photos_has_no_cover(api):
    PropertyFactory()
    assert api.get(LIST).json()["results"][0]["cover_image"] is None


def test_card_photos_follow_the_gallery_order(api):
    prop = PropertyFactory()
    second = PropertyMediaFactory(property=prop, order=1, alt_text="Kitchen")
    first = PropertyMediaFactory(property=prop, order=0, alt_text="")
    PropertyMediaFactory(property=prop, order=2, kind=MediaKind.FLOOR_PLAN)
    for i in range(3, 12):
        PropertyMediaFactory(property=prop, order=i)
    photos = api.get(LIST).json()["results"][0]["photos"]
    assert len(photos) == 8  # floor plans excluded, capped for the card
    assert [p["public_id"] for p in photos[:2]] == [first.public_id, second.public_id]
    assert photos[0]["alt_text"] == f"{prop.title}, photo 1"  # fallback description
    assert photos[1]["alt_text"] == "Kitchen"


def test_pagination(api):
    for _ in range(7):
        PropertyFactory()
    data = api.get(LIST, {"page_size": 3, "page": 2}).json()
    assert (data["count"], data["page"], data["pages"], data["page_size"]) == (7, 2, 3, 3)
    assert len(data["results"]) == 3 and data["next"] and data["previous"]
    assert api.get(LIST, {"page_size": 1000}).json()["page_size"] == 48
    assert api.get(LIST, {"page": 99}).status_code == 404


def test_filters(api):
    apartment, house = PropertyTypeFactory(slug="flat"), PropertyTypeFactory(slug="home")
    area = AreaFactory(slug="kileleshwa-x")
    hood = NeighbourhoodFactory(area=area, slug="riverside-x")
    gym, lift = AmenityFactory(slug="gym-x"), AmenityFactory(slug="lift-x")
    a = PropertyFactory(
        property_type=apartment,
        deal_type=DealType.RENT,
        price=150_000,
        bedrooms=2,
        bathrooms=2,
        area=area,
        neighbourhood=hood,
        furnishing=Furnishing.FURNISHED,
        is_featured=True,
    )
    a.amenities.add(gym, lift)
    b = PropertyFactory(
        property_type=house, deal_type=DealType.SALE, price=25_000_000, bedrooms=4, bathrooms=4
    )
    b.amenities.add(gym)

    cases = {
        "deal=rent": [a],
        "type=home": [b],
        "type=flat,home": [a, b],
        f"county={area.county.slug}": [a],
        "area=kileleshwa-x": [a],
        "neighbourhood=riverside-x": [a],
        "min_price=1000000": [b],
        "max_price=200000": [a],
        "min_beds=3": [b],
        "min_baths=3": [b],
        "furnishing=furnished": [a],
        "amenities=gym-x": [a, b],
        "amenities=gym-x,lift-x": [a],
        "featured=true": [a],
    }
    for query, expected in cases.items():
        got = refs(api.get(f"{LIST}?{query}"))
        assert sorted(got) == sorted(p.reference for p in expected), query


def test_keyword_search(api):
    a = PropertyFactory(title="Garden villa", area=AreaFactory(name="Runda Estate"))
    b = PropertyFactory(title="City flat")
    assert refs(api.get(LIST, {"q": "villa"})) == [a.reference]
    assert refs(api.get(LIST, {"q": "runda"})) == [a.reference]
    assert refs(api.get(LIST, {"q": b.reference.lower()})) == [b.reference]
    assert len(refs(api.get(LIST, {"q": "  "}))) == 2


def test_sorting(api):
    cheap = PropertyFactory(price=1_000_000)
    dear = PropertyFactory(price=9_000_000)
    on_request = PropertyFactory(price=None, price_on_request=True)
    assert refs(api.get(LIST, {"sort": "price_asc"})) == [
        cheap.reference,
        dear.reference,
        on_request.reference,
    ]
    assert refs(api.get(LIST, {"sort": "price_desc"})) == [
        dear.reference,
        cheap.reference,
        on_request.reference,
    ]
    assert refs(api.get(LIST, {"sort": "newest"}))[0] == on_request.reference


def test_list_query_count_does_not_grow_with_results(api, django_assert_max_num_queries):
    for _ in range(8):
        PropertyMediaFactory(property=PropertyFactory())
    with django_assert_max_num_queries(4):
        assert len(refs(api.get(LIST))) == 8


def test_detail(api):
    prop = PropertyFactory(
        location=Point(36.785612, -1.290634, srid=4326), project=ProjectFactory()
    )
    prop.amenities.add(AmenityFactory(name="Borehole X"))
    PropertyMediaFactory(property=prop)
    data = api.get(reverse("property-detail", args=[prop.slug])).json()
    assert data["reference"] == prop.reference
    assert data["amenities"][0]["name"] == "Borehole X"
    assert len(data["media"]) == 1
    assert data["agent"] == {
        "name": prop.agent.get_full_name(),
        "phone": "+254700000001",
        "email": prop.agent.email,
    }
    assert data["project"]["slug"] == prop.project.slug
    assert (data["location"]["lat"], data["location"]["lng"]) == (-1.29, 36.79)
    assert data["location"]["is_exact"] is False


def test_detail_hides_unpublished_project(api):
    prop = PropertyFactory(project=ProjectFactory(is_published=False))
    data = api.get(reverse("property-detail", args=[prop.slug])).json()
    assert data["project"] is None


@pytest.mark.parametrize(
    ("status", "code"),
    [
        (Status.PUBLISHED, 200),
        (Status.SOLD, 200),
        (Status.LET, 200),
        (Status.DRAFT, 404),
        (Status.ARCHIVED, 404),
    ],
)
def test_detail_visibility(api, status, code):
    prop = PropertyFactory(status=status)
    assert api.get(reverse("property-detail", args=[prop.slug])).status_code == code


def test_lookups(api):
    types = api.get(reverse("property-types")).json()
    assert {"name": "Apartment", "slug": "apartment", "category": "residential"} in types
    amenities = api.get(reverse("amenities")).json()
    assert any(a["slug"] == "swimming-pool" and a["icon"] == "waves" for a in amenities)


def test_api_is_read_only(api):
    prop = PropertyFactory()
    assert api.post(LIST, {}).status_code == 405
    assert api.delete(reverse("property-detail", args=[prop.slug])).status_code == 405
