import factory
from django.contrib.gis.geos import Point

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import Amenity, DealType, Property, PropertyMedia, PropertyType, Status
from apps.locations.models import Area, County, Neighbourhood
from apps.projects.models import Project, ProjectMedia, UnitType


class CountyFactory(factory.django.DjangoModelFactory):
    code = factory.Sequence(lambda n: 100 + n)  # real counties (1-47) are seeded
    name = factory.Sequence(lambda n: f"Test County {n}")
    slug = factory.Sequence(lambda n: f"test-county-{n}")

    class Meta:
        model = County


class AreaFactory(factory.django.DjangoModelFactory):
    county = factory.SubFactory(CountyFactory)
    name = factory.Sequence(lambda n: f"Test Area {n}")
    slug = factory.Sequence(lambda n: f"test-area-{n}")
    location = Point(36.8, -1.29, srid=4326)

    class Meta:
        model = Area


class NeighbourhoodFactory(factory.django.DjangoModelFactory):
    area = factory.SubFactory(AreaFactory)
    name = factory.Sequence(lambda n: f"Test Neighbourhood {n}")
    slug = factory.Sequence(lambda n: f"test-neighbourhood-{n}")

    class Meta:
        model = Neighbourhood


class PropertyTypeFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Type {n}")
    slug = factory.Sequence(lambda n: f"type-{n}")
    category = "residential"

    class Meta:
        model = PropertyType


class AmenityFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Amenity {n}")
    slug = factory.Sequence(lambda n: f"amenity-{n}")

    class Meta:
        model = Amenity


class PropertyFactory(factory.django.DjangoModelFactory):
    title = factory.Sequence(lambda n: f"3 Bedroom Apartment {n}")
    description = "Spacious apartment."
    deal_type = DealType.SALE
    property_type = factory.SubFactory(PropertyTypeFactory)
    status = Status.PUBLISHED
    price = 10_000_000
    bedrooms = 3
    bathrooms = 2
    area = factory.SubFactory(AreaFactory)
    agent = factory.SubFactory(UserFactory, is_staff=True, phone="+254700000001")

    class Meta:
        model = Property


class PropertyMediaFactory(factory.django.DjangoModelFactory):
    property = factory.SubFactory(PropertyFactory)
    public_id = factory.Sequence(lambda n: f"alcom/test/properties/photo-{n}")
    width = 1200
    height = 900

    class Meta:
        model = PropertyMedia


class ProjectFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Riverside Gardens {n}")
    summary = "Modern apartments by the river."
    description = "Full description."
    area = factory.SubFactory(AreaFactory)
    is_published = True

    class Meta:
        model = Project


class UnitTypeFactory(factory.django.DjangoModelFactory):
    project = factory.SubFactory(ProjectFactory)
    name = "2 Bedroom"
    bedrooms = 2
    price_from = 8_000_000

    class Meta:
        model = UnitType


class ProjectMediaFactory(factory.django.DjangoModelFactory):
    project = factory.SubFactory(ProjectFactory)
    public_id = factory.Sequence(lambda n: f"alcom/test/projects/photo-{n}")

    class Meta:
        model = ProjectMedia
