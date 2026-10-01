import pytest
from django.urls import reverse

from apps.listings.tests.factories import ProjectFactory, ProjectMediaFactory, UnitTypeFactory
from apps.projects.models import Project, ProjectUpdate

pytestmark = pytest.mark.django_db


def test_slug_generated_and_unique():
    a = ProjectFactory(name="Skyline Heights")
    b = ProjectFactory(name="Skyline Heights")
    assert (a.slug, b.slug) == ("skyline-heights", "skyline-heights-2")
    assert str(a) == "Skyline Heights"


def test_list_only_published_with_price_from(api):
    live = ProjectFactory()
    ProjectFactory(is_published=False)
    UnitTypeFactory(project=live, price_from=12_000_000)
    UnitTypeFactory(project=live, price_from=7_500_000)
    ProjectMediaFactory(project=live)
    data = api.get(reverse("project-list")).json()["results"]
    assert [p["slug"] for p in data] == [live.slug]
    assert data[0]["price_from"] == 7_500_000
    assert data[0]["cover_image"]["public_id"].startswith("alcom/test/projects/")


def test_project_without_units_or_photos(api):
    ProjectFactory()
    item = api.get(reverse("project-list")).json()["results"][0]
    assert (item["price_from"], item["cover_image"]) == (None, None)


def test_detail(api):
    project = ProjectFactory()
    unit = UnitTypeFactory(project=project)
    ProjectUpdate.objects.create(project=project, date="2026-09-01", title="Foundations done")
    data = api.get(reverse("project-detail", args=[project.slug])).json()
    assert data["unit_types"][0]["name"] == unit.name
    assert data["updates"][0]["title"] == "Foundations done"
    assert str(unit) == f"{project.name}: {unit.name}"
    assert str(project.updates.first()) == "Foundations done"


def test_unpublished_detail_is_404(api):
    project = ProjectFactory(is_published=False)
    assert api.get(reverse("project-detail", args=[project.slug])).status_code == 404
    assert Project.objects.count() == 1
