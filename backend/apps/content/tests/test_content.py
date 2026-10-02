from datetime import timedelta
from unittest import mock

import cloudinary.utils
import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.content import models as content
from apps.content.models import Faq, JobOpening, TeamMember

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff(api):
    api.force_authenticate(UserFactory(is_staff=True))
    return api


@pytest.fixture(autouse=True)
def cloudinary_destroy():
    with mock.patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as destroy:
        yield destroy


def signed(public_id, version=1700000000):
    signature = cloudinary.utils.api_sign_request(
        {"public_id": public_id, "version": version}, "test-secret"
    )
    return {
        "public_id": public_id,
        "version": version,
        "signature": signature,
        "width": 800,
        "height": 800,
    }


def test_initial_faqs_were_migrated(api):
    data = api.get(reverse("faq-list")).json()
    assert data[0]["question"] == "How do I arrange a property viewing?"
    assert len(data) == 5
    valuation = api.get(reverse("faq-list"), {"category": "valuation,bogus"}).json()
    assert [f["category"] for f in valuation] == ["valuation"]


def test_public_lists_show_only_published_items_in_order(api):
    TeamMember.objects.create(name="Hidden", role="x", is_published=False)
    TeamMember.objects.create(name="Second", role="Valuer", order=2)
    TeamMember.objects.create(name="First", role="Director", order=1)
    assert [m["name"] for m in api.get(reverse("team-list")).json()] == ["First", "Second"]
    content.Testimonial.objects.create(
        quote="Great service", name="Jane", role="Landlord", rating=5
    )
    assert api.get(reverse("testimonial-list")).json()[0]["rating"] == 5


def test_staff_manage_and_reorder(staff, api):
    url = reverse("dashboard-faq-list")
    created = staff.post(
        url,
        {"question": "Do you survey land?", "answer": "Yes.", "category": "survey"},
        format="json",
    )
    assert created.status_code == 201 and created.json()["order"] == 6  # added at the end
    uuids = [f["uuid"] for f in staff.get(url).json()]
    staff.post(reverse("dashboard-faq-reorder"), {"uuids": uuids[::-1]}, format="json")
    assert api.get(reverse("faq-list")).json()[0]["question"] == "Do you survey land?"
    bad = staff.post(
        reverse("dashboard-faq-reorder"),
        {"uuids": [str(uuids[0]), "00000000-0000-0000-0000-000000000000"]},
        format="json",
    )
    assert bad.status_code == 400

    detail = reverse("dashboard-faq-detail", args=[created.json()["uuid"]])
    staff.patch(detail, {"is_published": False}, format="json")
    assert "Do you survey land?" not in str(api.get(reverse("faq-list")).json())
    assert staff.delete(detail).status_code == 204

    staff.force_authenticate(UserFactory())
    assert staff.get(url).status_code == 403


def test_team_photos_are_verified_replaced_and_cleaned_up(
    staff, cloudinary_destroy, django_capture_on_commit_callbacks
):
    url = reverse("dashboard-team-list")
    forged = {**signed("alcom/test/team/a"), "signature": "forged"}
    bad = staff.post(url, {"name": "Ann", "role": "Valuer", "photo_upload": forged}, format="json")
    assert bad.status_code == 400
    wrong_folder = staff.post(
        url,
        {"name": "Ann", "role": "Valuer", "photo_upload": signed("alcom/test/blog/a")},
        format="json",
    )
    assert wrong_folder.status_code == 400

    member = staff.post(
        url,
        {"name": "Ann", "role": "Valuer", "photo_upload": signed("alcom/test/team/a")},
        format="json",
    ).json()
    assert member["photo"]["public_id"] == "alcom/test/team/a"
    detail = reverse("dashboard-team-detail", args=[member["uuid"]])
    with django_capture_on_commit_callbacks(execute=True):
        staff.patch(detail, {"photo_upload": signed("alcom/test/team/b")}, format="json")
    cloudinary_destroy.assert_called_once_with(
        "alcom/test/team/a", resource_type="image", invalidate=True
    )
    cloudinary_destroy.reset_mock()
    with django_capture_on_commit_callbacks(execute=True):
        removed = staff.patch(detail, {"remove_photo": True}, format="json").json()
    assert removed["photo"] is None
    cloudinary_destroy.assert_called_once()

    assert (
        staff.post(reverse("upload-signature"), {"target": "team"}, format="json").json()["folder"]
        == "alcom/test/team"
    )


def test_careers(staff, api):
    url = reverse("dashboard-job-list")
    job = staff.post(
        url,
        {
            "title": "Property Manager",
            "summary": "Manage a portfolio.",
            "description": "<p>Duties</p><script>x</script>",
            "employment_type": "full_time",
            "is_published": True,
        },
        format="json",
    ).json()
    assert job["slug"] == "property-manager" and job["published_at"]
    assert job["description"] == "<p>Duties</p>"  # sanitised
    assert job["apply_email"] == "info@alcomconsultants.co.ke"

    staff.post(url, {"title": "Draft role", "summary": "x"}, format="json")
    closed = JobOpening.objects.create(
        title="Old role",
        summary="x",
        is_published=True,
        closing_date=timezone.localdate() - timedelta(days=1),
    )
    api.force_authenticate(None)
    listed = api.get(reverse("job-list")).json()
    assert [j["title"] for j in listed] == ["Property Manager"]
    old = api.get(reverse("job-detail", args=[closed.slug])).json()
    assert old["is_open"] is False and old["employment_type_label"] == "Full time"
    assert api.get(reverse("job-detail", args=["draft-role"])).status_code == 404


def test_faq_model_str():
    assert str(Faq(question="Q?")) == "Q?"
