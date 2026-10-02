import pytest
from django.urls import reverse

from apps.accounts.tests.factories import UserFactory
from apps.blog.tests.factories import PostFactory
from apps.content.models import JobOpening
from apps.core.demo import DEMO_EMAIL
from apps.listings.models import Status
from apps.locations.models import Area

from .factories import PropertyFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def demo_user():
    return UserFactory(email=DEMO_EMAIL, is_active=False)


def test_location_pages_count_listings_and_separate_demo_data(api, demo_user):
    kilimani = Area.objects.get(slug="kilimani")
    karen = Area.objects.get(slug="karen")
    PropertyFactory(area=kilimani, deal_type="rent")
    PropertyFactory(area=kilimani, deal_type="rent", created_by=demo_user)
    PropertyFactory(area=karen, deal_type="sale", created_by=demo_user)
    PropertyFactory(area=karen, deal_type="sale", status=Status.DRAFT)

    pages = api.get(reverse("seo-locations")).json()
    by_key = {(p["deal"], p["kind"], p["slug"]): p for p in pages}
    assert by_key[("rent", "area", "kilimani")]["listings"] == 2
    assert by_key[("rent", "area", "kilimani")]["real_listings"] == 1
    assert by_key[("rent", "county", "nairobi")]["county"] == "Nairobi"
    assert by_key[("sale", "area", "karen")]["real_listings"] == 0
    assert ("sale", "county", "kiambu") not in by_key  # nothing listed there
    assert pages[0]["listings"] >= pages[-1]["listings"]  # busiest first


def test_sitemap_leaves_out_demo_data_and_drafts(api, demo_user):
    real = PropertyFactory()
    PropertyFactory(created_by=demo_user)
    PropertyFactory(status=Status.DRAFT)
    post = PostFactory()
    PostFactory(created_by=demo_user)
    JobOpening.objects.create(title="Valuer", summary="x", is_published=True)
    JobOpening.objects.create(title="Draft", summary="x")

    data = api.get(reverse("seo-sitemap")).json()
    assert [p["slug"] for p in data["properties"]] == [real.slug]
    assert [p["slug"] for p in data["posts"]] == [post.slug]
    assert [j["slug"] for j in data["jobs"]] == ["valuer"]
    assert all(p["real_listings"] for p in data["locations"])


def test_detail_pages_say_whether_they_are_demo_data(api, demo_user):
    demo = PropertyFactory(created_by=demo_user)
    real = PropertyFactory()
    assert api.get(reverse("property-detail", args=[demo.slug])).json()["is_demo"] is True
    assert api.get(reverse("property-detail", args=[real.slug])).json()["is_demo"] is False
    post = PostFactory(created_by=demo_user)
    assert api.get(reverse("blog-post-detail", args=[post.slug])).json()["is_demo"] is True
