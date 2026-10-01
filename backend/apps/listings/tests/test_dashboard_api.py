import pytest
from django.urls import reverse

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import Property, Status

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
LIST = reverse("dashboard-property-list")


def detail(prop):
    return reverse("dashboard-property-detail", args=[prop.uuid])


@pytest.fixture
def staff():
    return UserFactory(is_staff=True, first_name="Wanjiku", last_name="Kamau")


@pytest.fixture
def client(api, staff):
    api.force_authenticate(staff)
    return api


@pytest.fixture
def payload():
    area = AreaFactory()
    PropertyTypeFactory(slug="apartment-x")
    AmenityFactory(slug="gym-x")
    return {
        "title": "3 Bedroom Apartment in Kilimani",
        "description": "Bright and spacious.",
        "deal_type": "rent",
        "property_type": "apartment-x",
        "price": 150000,
        "price_unit": "per_month",
        "bedrooms": 3,
        "bathrooms": 2,
        "amenities": ["gym-x"],
        "area": area.id,
        "status": "draft",
    }


def test_staff_only(api):
    assert api.get(LIST).status_code == 403
    api.force_authenticate(UserFactory())  # signed in, not staff
    assert api.get(LIST).status_code == 403
    assert api.get(reverse("dashboard-lookups")).status_code == 403


def test_lookups(client):
    hood = NeighbourhoodFactory(name="Yaya")
    ProjectFactory(name="Skyline Heights")
    data = client.get(reverse("dashboard-lookups")).json()
    assert any(t["slug"] == "apartment" for t in data["property_types"])
    assert any(a["slug"] == "borehole" and a["group"] == "Utilities" for a in data["amenities"])
    nairobi = next(c for c in data["counties"] if c["name"] == "Nairobi")
    assert any(a["name"] == "Kilimani" for a in nairobi["areas"])
    county = next(c for c in data["counties"] if c["id"] == hood.area.county_id)
    assert county["areas"][0]["neighbourhoods"] == [{"id": hood.id, "name": "Yaya"}]
    assert any(a["name"] == "Wanjiku Kamau" for a in data["agents"])
    assert data["projects"][0]["name"] == "Skyline Heights"


def test_create_records_author_and_location(client, payload, staff):
    payload.update(lat=-1.2906, lng=36.7856, show_exact_location=True)
    response = client.post(LIST, payload, format="json")
    assert response.status_code == 201, response.json()
    data = response.json()
    assert data["reference"].startswith("ALC-R-")
    assert data["created_by"] == data["updated_by"] == "Wanjiku Kamau"
    assert (data["lat"], data["lng"]) == (-1.2906, 36.7856)
    assert data["amenities"] == ["gym-x"]
    prop = Property.objects.get(uuid=data["uuid"])
    assert prop.created_by == staff and prop.status == Status.DRAFT


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"price": None}, "price"),
        ({"lat": 51.5, "lng": -0.12}, "lat"),  # London
        ({"lat": -1.29}, "lat"),  # one without the other
        ({"neighbourhood": "other-area"}, "neighbourhood"),
        ({"property_type": "no-such-type"}, "property_type"),
    ],
)
def test_create_validation(client, payload, change, field):
    if change.get("neighbourhood") == "other-area":
        change = {"neighbourhood": NeighbourhoodFactory().id}
    payload.update(change)
    response = client.post(LIST, payload, format="json")
    assert response.status_code == 400
    assert field in response.json()


def test_price_on_request_needs_no_price(client, payload):
    payload.update(price=None, price_on_request=True)
    assert client.post(LIST, payload, format="json").status_code == 201


def test_edit_publish_and_audit(client, staff):
    prop = PropertyFactory(status=Status.DRAFT, created_by=UserFactory(is_staff=True))
    response = client.patch(
        detail(prop), {"status": "published", "is_featured": True}, format="json"
    )
    assert response.status_code == 200, response.json()
    prop.refresh_from_db()
    assert prop.status == Status.PUBLISHED and prop.published_at is not None
    assert prop.updated_by == staff and prop.created_by != staff


def test_clearing_location(client):
    prop = PropertyFactory()
    client.patch(detail(prop), {"lat": -1.29, "lng": 36.79}, format="json")
    prop.refresh_from_db()
    assert prop.location is not None
    client.patch(detail(prop), {"lat": None, "lng": None}, format="json")
    prop.refresh_from_db()
    assert prop.location is None


def test_neighbourhood_checked_against_existing_area(client):
    prop = PropertyFactory()
    response = client.patch(
        detail(prop), {"neighbourhood": NeighbourhoodFactory().id}, format="json"
    )
    assert response.status_code == 400


def test_list_shows_every_status_with_filters_and_counts(client):
    draft = PropertyFactory(status=Status.DRAFT, title="Garden cottage")
    live = PropertyFactory(status=Status.PUBLISHED)
    sold = PropertyFactory(status=Status.SOLD)
    let = PropertyFactory(status=Status.LET)
    PropertyMediaFactory(property=live)
    PropertyMediaFactory(property=live)

    rows = client.get(LIST).json()["results"]
    assert {r["uuid"] for r in rows} == {str(p.uuid) for p in (draft, live, sold, let)}
    live_row = next(r for r in rows if r["uuid"] == str(live.uuid))
    assert live_row["photo_count"] == 2 and live_row["cover_image"].startswith("alcom/test/")

    def refs(**params):
        return {r["reference"] for r in client.get(LIST, params).json()["results"]}

    assert refs(status="draft") == {draft.reference}
    assert refs(status="closed") == {sold.reference, let.reference}
    assert refs(q="cottage") == {draft.reference}
    assert refs(q=live.reference.lower()) == {live.reference}


def test_list_sorting(client):
    cheap, dear = PropertyFactory(price=1_000_000), PropertyFactory(price=9_000_000)
    rows = client.get(LIST, {"sort": "-price"}).json()["results"]
    assert [r["uuid"] for r in rows] == [str(dear.uuid), str(cheap.uuid)]


def test_only_drafts_can_be_deleted(client):
    live = PropertyFactory(status=Status.PUBLISHED)
    response = client.delete(detail(live))
    assert response.status_code == 400
    assert "Archive" in response.json()["detail"]
    draft = PropertyFactory(status=Status.DRAFT)
    assert client.delete(detail(draft)).status_code == 204
    assert not Property.objects.filter(pk=draft.pk).exists()


def test_put_is_not_allowed(client, payload):
    prop = PropertyFactory()
    assert client.put(detail(prop), payload, format="json").status_code == 405
