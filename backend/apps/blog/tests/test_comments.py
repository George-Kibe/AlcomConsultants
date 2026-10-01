import pytest
from allauth.account.models import EmailAddress
from django.core.cache import cache
from django.urls import reverse

from apps.accounts.tests.factories import UserFactory
from apps.blog.models import Comment, PostStatus

from .factories import PostFactory

pytestmark = pytest.mark.django_db


def reader(email="reader@example.com", verified=True, **kwargs):
    user = UserFactory(email=email, first_name="Jane", last_name="Wanjiru", **kwargs)
    EmailAddress.objects.create(user=user, email=email, verified=verified, primary=True)
    return user


def url(post, *args):
    name = "blog-comment-detail" if args else "blog-comment-list"
    return reverse(name, args=[post.slug, *args])


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


def test_anyone_can_read_visible_comments_oldest_first(api):
    post = PostFactory()
    first = Comment.objects.create(post=post, author=reader(), body="First!")
    Comment.objects.create(post=post, author=reader("b@example.com"), body="Spam", is_hidden=True)
    staff = UserFactory(is_staff=True, first_name="Ann")
    Comment.objects.create(post=post, author=staff, body="Thanks for reading")
    data = api.get(url(post)).json()
    assert [c["body"] for c in data] == ["First!", "Thanks for reading"]
    assert data[0]["author_name"] == "Jane W."  # never the email address
    assert data[1]["author_name"] == "Ann (Alcom Consultants)"
    assert data[0]["is_mine"] is False
    assert first.id == data[0]["id"]


def test_comments_only_on_published_posts(api):
    draft = PostFactory(status=PostStatus.DRAFT, published_at=None)
    assert api.get(url(draft)).status_code == 404


def test_posting_needs_a_signed_in_verified_reader(api):
    post = PostFactory()
    denied = api.post(url(post), {"body": "Hello"}, format="json")
    assert denied.status_code == 403

    api.force_authenticate(reader(verified=False))
    unverified = api.post(url(post), {"body": "Hello"}, format="json")
    assert unverified.status_code == 403
    assert unverified.json()["detail"] == "Verify your email address to comment."

    api.force_authenticate(reader("ok@example.com"))
    created = api.post(url(post), {"body": "  Very helpful, thanks.  "}, format="json")
    assert created.status_code == 201, created.json()
    assert created.json()["body"] == "Very helpful, thanks."
    assert created.json()["is_mine"] is True


def test_staff_may_comment_without_a_verified_address(api):
    api.force_authenticate(UserFactory(is_staff=True))
    assert api.post(url(PostFactory()), {"body": "Hi"}, format="json").status_code == 201


@pytest.mark.parametrize(
    ("body", "error"),
    [
        ("", "This field may not be blank."),
        ("x", "Write a comment first."),
        ("a" * 2001, "Ensure this field has no more than 2000 characters."),
        ("http://a.ke http://b.ke www.c.ke", "Comments can contain at most 2 links."),
    ],
)
def test_comment_validation(api, body, error):
    api.force_authenticate(reader())
    response = api.post(url(PostFactory()), {"body": body}, format="json")
    assert response.status_code == 400
    assert response.json()["body"] == [error]


def test_posting_is_rate_limited(api):
    api.force_authenticate(reader())
    post = PostFactory()
    codes = [api.post(url(post), {"body": f"Comment {i}"}, format="json").status_code
             for i in range(6)]  # fmt: skip
    assert codes == [201] * 5 + [429]


def test_authors_delete_their_own_comments_only(api):
    post = PostFactory()
    mine = Comment.objects.create(post=post, author=reader(), body="Mine")
    theirs = Comment.objects.create(post=post, author=reader("t@example.com"), body="Theirs")
    api.force_authenticate(mine.author)
    assert api.delete(url(post, theirs.id)).status_code == 403
    assert api.delete(url(post, mine.id)).status_code == 204
    assert not Comment.objects.filter(id=mine.id).exists()


def test_staff_moderation(api):
    post = PostFactory(title="Land guide")
    comment = Comment.objects.create(post=post, author=reader(), body="Buy cheap watches")
    Comment.objects.create(post=post, author=reader("b@example.com"), body="Great read")
    staff = UserFactory(is_staff=True, first_name="Ann", last_name="Otieno")
    listing = reverse("dashboard-blog-comment-list")
    assert api.get(listing).status_code == 403

    api.force_authenticate(staff)
    rows = api.get(listing, {"q": "watches"}).json()["results"]
    assert [r["id"] for r in rows] == [comment.id]
    assert rows[0]["author_email"] == "reader@example.com"
    assert rows[0]["post"]["title"] == "Land guide"

    detail = reverse("dashboard-blog-comment-detail", args=[comment.id])
    hidden = api.patch(detail, {"is_hidden": True}, format="json").json()
    assert hidden["is_hidden"] is True and hidden["hidden_by_name"] == "Ann Otieno"
    assert [c["body"] for c in api.get(url(post)).json()] == ["Great read"]
    assert [r["id"] for r in api.get(listing, {"hidden": "true"}).json()["results"]] == [comment.id]

    restored = api.patch(detail, {"is_hidden": False}, format="json").json()
    assert restored["is_hidden"] is False and restored["hidden_by_name"] == ""
    assert api.delete(detail).status_code == 204
