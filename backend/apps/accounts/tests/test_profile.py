import json
import secrets

import pytest
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.blog.models import Comment
from apps.blog.tests.factories import PostFactory
from apps.listings.tests.factories import PropertyFactory
from apps.saved.models import Favourite, SavedSearch

pytestmark = pytest.mark.django_db
PASSWORD = secrets.token_urlsafe(16)  # generated per run; no credentials in the repo


@pytest.fixture
def visitor():
    user = UserFactory(first_name="Esther", last_name="Njeri")
    user.set_password(PASSWORD)
    user.save()
    return user


@pytest.fixture
def client(api, visitor):
    api.force_authenticate(visitor)
    return api


def test_me_shows_profile_and_preferences(client, visitor):
    data = client.get(reverse("me")).json()
    assert data["email"] == visitor.email
    assert data["has_password"] is True
    assert data["marketing_opt_in"] is False and data["marketing_opt_in_at"] is None


def test_update_profile(client, visitor):
    url = reverse("me")
    data = client.patch(
        url,
        {"first_name": " Esther ", "last_name": "W", "phone": "0712 345 678", "email": "x@y.z"},
        format="json",
    ).json()
    assert (data["first_name"], data["last_name"], data["phone"]) == ("Esther", "W", "0712 345 678")
    visitor.refresh_from_db()
    assert visitor.email != "x@y.z"  # email changes aren't possible here

    errors = client.patch(url, {"phone": "call me", "first_name": ""}, format="json").json()
    assert set(errors) == {"phone", "first_name"}
    assert client.put(url, {"first_name": "A"}, format="json").status_code == 405


def test_marketing_consent_is_timestamped(client):
    url = reverse("me")
    on = client.patch(url, {"marketing_opt_in": True}, format="json").json()
    assert on["marketing_opt_in"] is True and on["marketing_opt_in_at"]
    same = client.patch(url, {"marketing_opt_in": True}, format="json").json()
    assert same["marketing_opt_in_at"] == on["marketing_opt_in_at"]
    off = client.patch(url, {"marketing_opt_in": False}, format="json").json()
    assert off["marketing_opt_in_at"] is None


def test_export_contains_everything_about_the_visitor(client, visitor):
    prop = PropertyFactory(title="Garden flat")
    Favourite.objects.create(user=visitor, property=prop)
    SavedSearch.objects.create(user=visitor, name="Rentals", query="deal=rent")
    Comment.objects.create(post=PostFactory(title="Valuations"), author=visitor, body="Thanks!")
    Favourite.objects.create(user=UserFactory(), property=prop)  # someone else's

    response = client.get(reverse("me-export"))
    assert response.status_code == 200
    assert response["Content-Disposition"].startswith('attachment; filename="alcom-account-')
    data = json.loads(response.content)
    assert data["account"]["email"] == visitor.email
    assert [f["title"] for f in data["favourites"]] == ["Garden flat"]
    assert data["saved_searches"][0]["search"] == "/properties?deal=rent"
    assert data["blog_comments"][0] == {
        "article": "Valuations",
        "comment": "Thanks!",
        "posted_at": data["blog_comments"][0]["posted_at"],
        "hidden_by_moderator": False,
    }
    assert data["consent"]["news_and_offers_by_email"] is False


def test_delete_account_keeps_comments_as_former_reader(client, api, visitor):
    post = PostFactory()
    comment = Comment.objects.create(post=post, author=visitor, body="Very helpful")
    Favourite.objects.create(user=visitor, property=PropertyFactory())
    SavedSearch.objects.create(user=visitor, name="Rentals", query="deal=rent")
    url = reverse("me-delete")

    wrong = client.post(url, {"password": "nope"}, format="json")
    assert wrong.status_code == 400 and "password" in wrong.json()
    assert client.post(url, {"password": PASSWORD}, format="json").status_code == 204

    assert not User.objects.filter(pk=visitor.pk).exists()
    assert not Favourite.objects.exists() and not SavedSearch.objects.exists()
    comment.refresh_from_db()
    assert comment.author is None and comment.author_name == "Former reader"
    api.force_authenticate(None)
    listed = api.get(reverse("blog-comment-list", args=[post.slug])).json()
    assert listed == [
        {
            "id": comment.id,
            "author_name": "Former reader",
            "body": "Very helpful",
            "created_at": listed[0]["created_at"],
            "is_mine": False,
        }
    ]


def test_accounts_without_a_password_confirm_by_typing_delete(api):
    google_only = UserFactory()
    google_only.set_unusable_password()
    google_only.save()
    api.force_authenticate(google_only)
    url = reverse("me-delete")
    assert api.post(url, {"confirm": "yes"}, format="json").status_code == 400
    assert api.post(url, {"confirm": "DELETE"}, format="json").status_code == 204


def test_staff_cannot_delete_themselves(api):
    staff = UserFactory(is_staff=True)
    staff.set_password(PASSWORD)
    staff.save()
    api.force_authenticate(staff)
    assert api.post(reverse("me-delete"), {"password": PASSWORD}, format="json").status_code == 400
    assert User.objects.filter(pk=staff.pk).exists()


def test_signed_out_visitors_get_403(api):
    for name in ("me", "me-export"):
        assert api.get(reverse(name)).status_code == 403
    assert api.post(reverse("me-delete")).status_code == 403
