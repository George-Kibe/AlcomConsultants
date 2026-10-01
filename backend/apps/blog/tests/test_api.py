from datetime import timedelta
from unittest import mock

import cloudinary.utils
import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.blog.models import Post, PostStatus

from .factories import PostFactory

pytestmark = pytest.mark.django_db
SECRET = "test-secret"


def signed(public_id, version=1700000000):
    signature = cloudinary.utils.api_sign_request(
        {"public_id": public_id, "version": version}, SECRET
    )
    return {"public_id": public_id, "version": version, "signature": signature,
            "width": 1600, "height": 900, "alt_text": "Nairobi skyline"}  # fmt: skip


@pytest.fixture
def staff_client(api):
    api.force_authenticate(UserFactory(is_staff=True, first_name="Ann", last_name="Otieno"))
    return api


@pytest.fixture(autouse=True)
def cloudinary_destroy():
    with mock.patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as destroy:
        yield destroy


# ------------------------------------------------------------------ public


def test_list_shows_only_published_posts_newest_first(api):
    old = PostFactory(published_at=timezone.now() - timedelta(days=3))
    new = PostFactory()
    PostFactory(status=PostStatus.DRAFT, published_at=None)
    PostFactory(published_at=timezone.now() + timedelta(days=1))  # scheduled
    data = api.get(reverse("blog-post-list")).json()
    assert [p["slug"] for p in data["results"]] == [new.slug, old.slug]
    item = data["results"][0]
    assert item["author_name"] == "Jane Wanjiru"
    assert item["reading_minutes"] == 1
    assert item["excerpt"].startswith("Always run a search")
    assert item["cover"]["alt_text"] == "Title deed on a desk"
    assert "res.cloudinary.com/test-cloud" in item["cover"]["url"]
    assert "body" not in item


def test_detail_and_unpublished_posts_are_404(api):
    post = PostFactory(excerpt="Short summary", seo_title="SEO")
    data = api.get(reverse("blog-post-detail", args=[post.slug])).json()
    assert data["body"].startswith("<p>Always run")
    assert data["excerpt"] == "Short summary"
    assert data["seo_title"] == "SEO"
    draft = PostFactory(status=PostStatus.DRAFT, published_at=None)
    assert api.get(reverse("blog-post-detail", args=[draft.slug])).status_code == 404


def test_author_fallback_and_slug_uniqueness():
    a = PostFactory(title="Same title", author=None)
    b = PostFactory(title="Same title")
    assert a.author_name == "Alcom Consultants"
    assert (a.slug, b.slug) == ("same-title", "same-title-2")


# ------------------------------------------------------------------ dashboard


def test_dashboard_is_staff_only(api):
    url = reverse("dashboard-blog-post-list")
    assert api.get(url).status_code == 403
    api.force_authenticate(UserFactory())
    assert api.get(url).status_code == 403


def test_create_edit_and_sanitise(staff_client):
    url = reverse("dashboard-blog-post-list")
    created = staff_client.post(
        url,
        {"title": "Valuation basics", "body": "<p>Hi<script>x</script></p>"},
        format="json",
    )
    assert created.status_code == 201, created.json()
    data = created.json()
    assert data["slug"] == "valuation-basics"
    assert data["status"] == "draft"
    assert data["author_name"] == "Ann Otieno"
    post = Post.objects.get(uuid=data["uuid"])
    assert post.body == "<p>Hi</p>"
    assert post.created_by == post.updated_by == post.author

    detail = reverse("dashboard-blog-post-detail", args=[post.uuid])
    PostFactory(slug="taken")
    taken = staff_client.patch(detail, {"slug": "taken"}, format="json")
    assert taken.status_code == 400
    renamed = staff_client.patch(detail, {"slug": "Valuation 101!"}, format="json").json()
    assert renamed["slug"] == "valuation-101"
    assert renamed["updated_by_name"] == "Ann Otieno"


def test_publishing_needs_a_body_and_a_cover(staff_client):
    post = PostFactory(status=PostStatus.DRAFT, published_at=None, cover_public_id="", body="")
    detail = reverse("dashboard-blog-post-detail", args=[post.uuid])
    errors = staff_client.patch(detail, {"status": "published"}, format="json").json()
    assert set(errors) == {"body", "cover"}

    post.cover_public_id = "alcom/test/blog/c"
    post.save()
    ok = staff_client.patch(
        detail, {"status": "published", "body": "<p>Ready</p>"}, format="json"
    ).json()
    assert ok["status"] == "published" and ok["published_at"]


def test_filters_and_delete_rules(staff_client):
    draft = PostFactory(title="Draft about rent", status=PostStatus.DRAFT, published_at=None)
    live = PostFactory(title="Live post")
    url = reverse("dashboard-blog-post-list")
    assert [p["uuid"] for p in staff_client.get(url, {"status": "draft"}).json()["results"]] == [
        str(draft.uuid)
    ]
    assert [p["title"] for p in staff_client.get(url, {"q": "rent"}).json()["results"]] == [
        "Draft about rent"
    ]
    refused = staff_client.delete(reverse("dashboard-blog-post-detail", args=[live.uuid]))
    assert refused.status_code == 400
    assert (
        staff_client.delete(reverse("dashboard-blog-post-detail", args=[draft.uuid])).status_code
        == 204
    )


def test_cover_upload_is_verified_and_replaces_the_old_one(
    staff_client, cloudinary_destroy, django_capture_on_commit_callbacks
):
    post = PostFactory(cover_public_id="alcom/test/blog/old")
    url = reverse("dashboard-blog-post-cover", args=[post.uuid])

    forged = {**signed("alcom/test/blog/new"), "signature": "forged"}
    assert staff_client.post(url, forged, format="json").status_code == 400
    elsewhere = staff_client.post(url, signed("alcom/test/properties/x"), format="json")
    assert elsewhere.status_code == 400

    with django_capture_on_commit_callbacks(execute=True):
        data = staff_client.post(url, signed("alcom/test/blog/new"), format="json").json()
    assert data["cover"]["public_id"] == "alcom/test/blog/new"
    assert data["cover"]["alt_text"] == "Nairobi skyline"
    cloudinary_destroy.assert_called_once_with(
        "alcom/test/blog/old", resource_type="image", invalidate=True
    )


def test_cover_removal_rules_and_cleanup_on_delete(
    staff_client, cloudinary_destroy, django_capture_on_commit_callbacks
):
    live = PostFactory()
    assert (
        staff_client.delete(reverse("dashboard-blog-post-cover", args=[live.uuid])).status_code
        == 400
    )

    draft = PostFactory(status=PostStatus.DRAFT, published_at=None,
                        cover_public_id="alcom/test/blog/d")  # fmt: skip
    with django_capture_on_commit_callbacks(execute=True):
        data = staff_client.delete(reverse("dashboard-blog-post-cover", args=[draft.uuid])).json()
    assert data["cover"] is None
    cloudinary_destroy.assert_called_once()

    other = PostFactory(status=PostStatus.DRAFT, published_at=None,
                        cover_public_id="alcom/test/blog/e")  # fmt: skip
    cloudinary_destroy.reset_mock()
    with django_capture_on_commit_callbacks(execute=True):
        other.delete()
    cloudinary_destroy.assert_called_once()


def test_blog_is_an_upload_target(staff_client):
    data = staff_client.post(reverse("upload-signature"), {"target": "blog"}, format="json").json()
    assert data["folder"] == "alcom/test/blog"
