from unittest import mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.core import media
from apps.core.text import unique_slug
from apps.listings.models import Property, PropertyMedia
from apps.listings.tests.factories import (
    AreaFactory,
    ProjectFactory,
    PropertyFactory,
    PropertyMediaFactory,
    PropertyTypeFactory,
)
from apps.locations.models import County
from apps.projects.models import Project

pytestmark = pytest.mark.django_db

UPLOAD_RESULT = {
    "public_id": "alcom/test/properties/abc123",
    "resource_type": "image",
    "width": 1600,
    "height": 1200,
    "bytes": 345678,
    "format": "jpg",
}


def test_delivery_url_optimises_images():
    url = media.delivery_url("alcom/x/photo", width=400)
    assert url.startswith("https://res.cloudinary.com/test-cloud/image/upload/")
    assert "f_auto" in url and "q_auto" in url and "w_400" in url


def test_delivery_url_for_video_is_untouched():
    url = media.delivery_url("alcom/x/clip", resource_type="video")
    assert "/video/upload/" in url and "f_auto" not in url


def test_upload_uses_environment_folder():
    with mock.patch("cloudinary.uploader.upload", return_value=UPLOAD_RESULT) as up:
        assert media.upload(b"data", folder="properties") == UPLOAD_RESULT
    assert up.call_args.kwargs["folder"] == "alcom/test/properties"


def test_unique_slug():
    project = ProjectFactory(name="Palm Court")
    other = Project(name="Palm Court")
    assert unique_slug(other, "Palm Court") == "palm-court-2"
    assert unique_slug(project, "Palm Court") == "palm-court"  # its own slug is free
    assert unique_slug(other, "!!!") == "item"


@pytest.fixture
def admin_client(client, django_user_model):
    user = django_user_model.objects.create_superuser("admin@example.com", "S3cure-pass-123")
    client.force_login(user)
    return client


def admin_url(name, *args):
    from django.conf import settings

    return reverse(f"admin:{name}", args=args) if settings.ADMIN_URL else None


@pytest.mark.parametrize(
    "model",
    [
        "listings_property",
        "listings_propertytype",
        "listings_amenity",
        "projects_project",
        "locations_county",
        "locations_area",
        "locations_neighbourhood",
    ],
)
def test_admin_pages_load(admin_client, model):
    assert admin_client.get(admin_url(f"{model}_changelist")).status_code == 200
    assert admin_client.get(admin_url(f"{model}_add")).status_code == 200


def test_admin_change_pages_load_with_media_previews(admin_client):
    prop = PropertyFactory()
    PropertyMediaFactory(property=prop)
    PropertyMediaFactory(property=prop, resource_type="video", kind="video")
    page = admin_client.get(admin_url("listings_property_change", prop.pk))
    assert page.status_code == 200
    assert b"res.cloudinary.com/test-cloud" in page.content
    assert (
        admin_client.get(admin_url("projects_project_change", ProjectFactory().pk)).status_code
        == 200
    )
    county = County.objects.get(code=47)
    assert admin_client.get(admin_url("locations_county_change", county.pk)).status_code == 200


def test_admin_uploads_photo_to_cloudinary(admin_client):
    area, ptype = AreaFactory(), PropertyTypeFactory()
    form = {
        "title": "Test upload",
        "description": "x",
        "status": "draft",
        "deal_type": "sale",
        "property_type": ptype.pk,
        "price": "5000000",
        "price_unit": "total",
        "land_area_unit": "acres",
        "area": area.pk,
        "media-TOTAL_FORMS": "1",
        "media-INITIAL_FORMS": "0",
        "media-MIN_NUM_FORMS": "0",
        "media-MAX_NUM_FORMS": "1000",
        "media-0-upload": SimpleUploadedFile("front.jpg", b"jpeg-bytes", "image/jpeg"),
        "media-0-kind": "image",
        "media-0-alt_text": "Front",
        "media-0-order": "0",
    }
    with mock.patch("cloudinary.uploader.upload", return_value=UPLOAD_RESULT) as up:
        response = admin_client.post(admin_url("listings_property_add"), form)
    assert response.status_code == 302, response.content[:2000]
    assert up.call_args.kwargs["folder"] == "alcom/test/properties"
    photo = PropertyMedia.objects.get()
    assert (photo.public_id, photo.width, photo.format) == (
        "alcom/test/properties/abc123",
        1600,
        "jpg",
    )
    assert Property.objects.get().reference.startswith("ALC-S-")


def test_admin_media_row_without_file_is_rejected(admin_client):
    area, ptype = AreaFactory(), PropertyTypeFactory()
    form = {
        "title": "No file",
        "description": "x",
        "status": "draft",
        "deal_type": "sale",
        "property_type": ptype.pk,
        "price": "5000000",
        "price_unit": "total",
        "land_area_unit": "acres",
        "area": area.pk,
        "media-TOTAL_FORMS": "1",
        "media-INITIAL_FORMS": "0",
        "media-MIN_NUM_FORMS": "0",
        "media-MAX_NUM_FORMS": "1000",
        "media-0-kind": "image",
        "media-0-alt_text": "Only text",
        "media-0-order": "0",
    }
    response = admin_client.post(admin_url("listings_property_add"), form)
    assert response.status_code == 200
    assert b"Choose a file to upload." in response.content
    assert not Property.objects.exists()


def test_admin_upload_without_cloudinary_shows_clear_error(admin_client, settings):
    settings.CLOUDINARY_URL = ""
    area, ptype = AreaFactory(), PropertyTypeFactory()
    form = {
        "title": "No cloud",
        "description": "x",
        "status": "draft",
        "deal_type": "sale",
        "property_type": ptype.pk,
        "price": "5000000",
        "price_unit": "total",
        "land_area_unit": "acres",
        "area": area.pk,
        "media-TOTAL_FORMS": "1",
        "media-INITIAL_FORMS": "0",
        "media-MIN_NUM_FORMS": "0",
        "media-MAX_NUM_FORMS": "1000",
        "media-0-upload": SimpleUploadedFile("front.jpg", b"jpeg-bytes", "image/jpeg"),
        "media-0-kind": "image",
        "media-0-order": "0",
    }
    response = admin_client.post(admin_url("listings_property_add"), form)
    assert b"Photo uploads are not set up yet" in response.content
    assert not Property.objects.exists()
