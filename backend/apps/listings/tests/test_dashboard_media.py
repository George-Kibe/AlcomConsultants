from unittest import mock

import cloudinary
import cloudinary.utils
import pytest
from django.urls import reverse

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import PropertyMedia, Status

from .factories import PropertyFactory, PropertyMediaFactory

pytestmark = pytest.mark.django_db
SECRET = "test-secret"


def signed_result(public_id, version=1700000000):
    signature = cloudinary.utils.api_sign_request(
        {"public_id": public_id, "version": version}, SECRET
    )
    return {
        "public_id": public_id,
        "version": version,
        "signature": signature,
        "width": 1600,
        "height": 1200,
        "bytes": 345678,
        "format": "jpg",
    }


def media_url(prop, *args):
    name = "dashboard-property-media-detail" if args else "dashboard-property-media-list"
    return reverse(name, args=[prop.uuid, *args])


@pytest.fixture
def staff():
    return UserFactory(is_staff=True)


@pytest.fixture
def client(api, staff):
    api.force_authenticate(staff)
    return api


@pytest.fixture(autouse=True)
def cloudinary_destroy():
    with mock.patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as destroy:
        yield destroy


def test_upload_signature_is_genuine_and_scoped(client):
    data = client.post(reverse("upload-signature"), {"target": "properties"}, format="json").json()
    assert data["folder"] == "alcom/test/properties"
    assert data["upload_url"] == "https://api.cloudinary.com/v1_1/test-cloud/image/upload"
    assert data["api_key"] == "test-key"
    assert "jpg" in data["allowed_formats"] and "pdf" not in data["allowed_formats"]
    expected = cloudinary.utils.api_sign_request(
        {
            "folder": data["folder"],
            "timestamp": data["timestamp"],
            "allowed_formats": data["allowed_formats"],
        },
        SECRET,
    )
    assert data["signature"] == expected


def test_upload_signature_rejects_unknown_target(client):
    response = client.post(reverse("upload-signature"), {"target": "../etc"}, format="json")
    assert response.status_code == 400


def test_staff_only(api):
    prop = PropertyFactory()
    assert api.post(reverse("upload-signature"), {"target": "properties"}).status_code == 403
    api.force_authenticate(UserFactory())
    assert api.get(media_url(prop)).status_code == 403


def test_attach_verified_upload_appends_in_order(client, staff):
    prop = PropertyFactory(updated_by=None)
    first = client.post(media_url(prop), signed_result("alcom/test/properties/a1"), format="json")
    second = client.post(
        media_url(prop),
        {**signed_result("alcom/test/properties/b2"), "kind": "floor_plan", "alt_text": "Plan"},
        format="json",
    )
    assert first.status_code == second.status_code == 201, first.json()
    assert first.json()["order"] == 0 and second.json()["order"] == 1
    assert second.json()["kind"] == "floor_plan"
    assert first.json()["url"].startswith("https://res.cloudinary.com/test-cloud/")
    prop.refresh_from_db()
    assert prop.updated_by == staff


def test_attach_rejects_forged_signature(client):
    prop = PropertyFactory()
    payload = {**signed_result("alcom/test/properties/a1"), "signature": "forged"}
    response = client.post(media_url(prop), payload, format="json")
    assert response.status_code == 400
    assert "could not be verified" in str(response.json())
    assert not PropertyMedia.objects.exists()


def test_attach_rejects_uploads_outside_the_listings_folder(client):
    prop = PropertyFactory()
    response = client.post(media_url(prop), signed_result("someone-else/photo"), format="json")
    assert response.status_code == 400


def test_list_update_and_reorder(client):
    prop = PropertyFactory()
    a, b, c = (PropertyMediaFactory(property=prop, order=i) for i in range(3))
    assert [m["id"] for m in client.get(media_url(prop)).json()] == [a.id, b.id, c.id]

    response = client.patch(
        media_url(prop, b.id),
        {"alt_text": "Living room", "kind": "floor_plan", "public_id": "hijack"},
        format="json",
    )
    assert response.status_code == 200
    b.refresh_from_db()
    assert (b.alt_text, b.kind) == ("Living room", "floor_plan")
    assert b.public_id != "hijack"  # read-only

    reorder = reverse("dashboard-property-media-reorder", args=[prop.uuid])
    response = client.post(reorder, {"ids": [c.id, a.id, b.id]}, format="json")
    assert [m["id"] for m in response.json()] == [c.id, a.id, b.id]
    assert client.post(reorder, {"ids": [c.id, a.id]}, format="json").status_code == 400
    other = PropertyMediaFactory()
    assert client.post(reorder, {"ids": [a.id, b.id, other.id]}, format="json").status_code == 400


def test_delete_removes_from_cloudinary(
    client, cloudinary_destroy, django_capture_on_commit_callbacks
):
    prop = PropertyFactory()
    photo = PropertyMediaFactory(property=prop)
    with django_capture_on_commit_callbacks(execute=True):
        assert client.delete(media_url(prop, photo.id)).status_code == 204
    assert not PropertyMedia.objects.exists()
    cloudinary_destroy.assert_called_once_with(
        photo.public_id, resource_type="image", invalidate=True
    )


def test_deleting_a_draft_removes_all_its_photos(
    client, cloudinary_destroy, django_capture_on_commit_callbacks
):
    prop = PropertyFactory(status=Status.DRAFT)
    PropertyMediaFactory(property=prop)
    PropertyMediaFactory(property=prop)
    with django_capture_on_commit_callbacks(execute=True):
        client.delete(reverse("dashboard-property-detail", args=[prop.uuid]))
    assert cloudinary_destroy.call_count == 2


def test_media_of_another_listing_is_not_reachable(client):
    prop, other = PropertyFactory(), PropertyFactory()
    photo = PropertyMediaFactory(property=other)
    assert (
        client.patch(media_url(prop, photo.id), {"alt_text": "x"}, format="json").status_code == 404
    )
    assert client.get(media_url(PropertyFactory.build())).status_code == 200  # empty list


def test_cleanup_task_retries_when_cloudinary_fails(cloudinary_destroy):
    from apps.core.tasks import delete_cloudinary_asset

    cloudinary_destroy.side_effect = ConnectionError("down")
    with (
        mock.patch.object(delete_cloudinary_asset, "retry", side_effect=RuntimeError("retry")),
        pytest.raises(RuntimeError, match="retry"),
    ):
        delete_cloudinary_asset.apply(args=["x"]).get()
