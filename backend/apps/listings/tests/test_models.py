import pytest
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.listings.models import Amenity, DealType, Property, PropertyType, Status

from .factories import AreaFactory, NeighbourhoodFactory, PropertyFactory

pytestmark = pytest.mark.django_db


def test_property_types_and_amenities_are_seeded():
    assert PropertyType.objects.filter(slug="apartment", category="residential").exists()
    assert PropertyType.objects.filter(category="land").count() == 3
    assert Amenity.objects.filter(slug="borehole").exists()


@pytest.mark.parametrize(
    ("deal", "letter"), [(DealType.SALE, "S"), (DealType.RENT, "R"), (DealType.LEASE, "L")]
)
def test_reference_and_slug_are_generated(deal, letter):
    prop = PropertyFactory(title="4 Bedroom Villa, Karen", deal_type=deal)
    assert prop.reference == f"ALC-{letter}-{1000 + prop.pk}"
    assert prop.slug == f"4-bedroom-villa-karen-{prop.reference.lower()}"
    assert str(prop) == f"{prop.reference} — 4 Bedroom Villa, Karen"


def test_reference_and_slug_stay_stable_on_edit():
    prop = PropertyFactory()
    reference, slug = prop.reference, prop.slug
    prop.title, prop.deal_type = "Renamed", DealType.RENT
    prop.save()
    prop.refresh_from_db()
    assert (prop.reference, prop.slug) == (reference, slug)


def test_published_at_is_set_once_when_listed():
    prop = PropertyFactory(status=Status.DRAFT)
    assert prop.published_at is None
    prop.status = Status.PUBLISHED
    prop.save()
    first = prop.published_at
    assert first is not None
    prop.status = Status.UNDER_OFFER
    prop.save()
    assert prop.published_at == first
    assert prop.is_listed


def test_neighbourhood_must_belong_to_area():
    prop = PropertyFactory.build(area=AreaFactory(), neighbourhood=NeighbourhoodFactory())
    with pytest.raises(ValidationError, match="not in the selected area"):
        prop.clean()


def test_price_required_unless_on_request():
    prop = PropertyFactory.build(price=None, area=AreaFactory())
    with pytest.raises(ValidationError, match="price on request"):
        prop.clean()
    prop.price_on_request = True
    prop.clean()  # no error


def test_price_constraint_enforced_in_database():
    prop = PropertyFactory()
    with pytest.raises(IntegrityError):
        Property.objects.filter(pk=prop.pk).update(price=None, price_on_request=False)


def test_public_location_is_approximate_unless_allowed():
    prop = PropertyFactory(location=Point(36.785612, -1.290634, srid=4326))
    assert prop.public_location == (-1.29, 36.79)
    prop.show_exact_location = True
    assert prop.public_location == (-1.290634, 36.785612)


def test_public_location_falls_back_to_area_centre():
    prop = PropertyFactory(location=None)
    assert prop.public_location == (-1.29, 36.8)
    prop.area.location = None
    assert prop.public_location is None


def test_listed_and_visible_querysets():
    statuses = {s: PropertyFactory(status=s) for s in Status}
    listed = set(Property.objects.listed())
    visible = set(Property.objects.visible())
    assert listed == {statuses[Status.PUBLISHED], statuses[Status.UNDER_OFFER]}
    assert visible == listed | {statuses[Status.SOLD], statuses[Status.LET]}
