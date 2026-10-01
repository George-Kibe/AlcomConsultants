import email.policy
from datetime import timedelta

import pytest
from allauth.account.models import EmailAddress
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import Furnishing, Status
from apps.listings.tests.factories import PropertyFactory, PropertyMediaFactory
from apps.locations.models import Area
from apps.saved import alerts, search
from apps.saved.models import MAX_SAVED_SEARCHES, Favourite, SavedSearch
from apps.saved.tasks import send_saved_search_alerts

pytestmark = pytest.mark.django_db


@pytest.fixture
def visitor():
    user = UserFactory(first_name="Esther")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    return user


@pytest.fixture
def client(api, visitor):
    api.force_authenticate(visitor)
    return api


# ------------------------------------------------------------------ favourites


def test_favourites_need_an_account(api):
    prop = PropertyFactory()
    assert api.get(reverse("favourite-list")).status_code == 403
    assert api.put(reverse("favourite-detail", args=[prop.slug])).status_code == 403


def test_add_list_and_remove_favourites(client, visitor):
    first, second = PropertyFactory(), PropertyFactory()
    PropertyMediaFactory(property=second)
    for prop in (first, second, second):  # adding twice is harmless
        assert client.put(reverse("favourite-detail", args=[prop.slug])).status_code == 204

    data = client.get(reverse("favourite-list")).json()
    assert [p["slug"] for p in data] == [second.slug, first.slug]  # newest first
    assert data[0]["cover_image"]["public_id"].startswith("alcom/test/properties/")
    assert sorted(client.get(reverse("favourite-slugs")).json()) == sorted(
        [first.slug, second.slug]
    )

    assert client.delete(reverse("favourite-detail", args=[first.slug])).status_code == 204
    assert client.get(reverse("favourite-slugs")).json() == [second.slug]
    assert Favourite.objects.filter(user=visitor).count() == 1


def test_sold_favourites_stay_and_withdrawn_ones_disappear(client):
    sold, archived = PropertyFactory(), PropertyFactory()
    for prop in (sold, archived):
        client.put(reverse("favourite-detail", args=[prop.slug]))
    sold.status, archived.status = Status.SOLD, Status.ARCHIVED
    sold.save()
    archived.save()
    data = client.get(reverse("favourite-list")).json()
    assert [(p["slug"], p["status"]) for p in data] == [(sold.slug, "sold")]
    # Drafts and archived listings can't be saved.
    assert client.put(reverse("favourite-detail", args=[archived.slug])).status_code == 404


def test_favourites_are_private(client):
    other = UserFactory()
    Favourite.objects.create(user=other, property=PropertyFactory())
    assert client.get(reverse("favourite-list")).json() == []


# ------------------------------------------------------------------ saved searches


def test_queries_are_normalised_and_described():
    query = search.normalise(  # areas, types and amenities are seeded by migrations
        "?sort=price_asc&page=3&view=map&area=kilimani&deal=rent&min_beds=2"
        "&type=apartment&max_price=150000&furnishing=furnished&amenities=gym&q="
    )
    assert query == (
        "deal=rent&type=apartment&area=kilimani&max_price=150000&min_beds=2"
        "&furnishing=furnished&amenities=gym"
    )
    assert search.describe(query) == (
        "Apartments for rent in Kilimani · 2+ beds · up to KES 150,000 · Furnished · with Gym"
    )
    assert search.describe("where=Westlands%2C+Nairobi&min_price=5000000") == (
        "Properties in Westlands · from KES 5,000,000"
    )
    assert search.describe("") == "Properties in Kenya"
    with pytest.raises(search.InvalidSearch):
        search.normalise("deal=swap")


def test_save_a_search(client, visitor):
    area = Area.objects.get(slug="kilimani")
    PropertyFactory(area=area, deal_type="rent", price=100_000)
    PropertyFactory(deal_type="rent")
    url = reverse("saved-search-list")

    created = client.post(url, {"query": "deal=rent&area=kilimani&page=2"}, format="json")
    assert created.status_code == 201
    data = created.json()
    assert data["name"] == "Properties for rent in Kilimani"
    assert data["path"] == "/properties?deal=rent&area=kilimani"
    assert data["alerts"] is True and data["match_count"] == 1

    again = client.post(url, {"query": "area=kilimani&deal=rent"}, format="json")
    assert again.status_code == 200 and again.json()["uuid"] == data["uuid"]

    bad = client.post(url, {"query": "min_price=lots"}, format="json")
    assert bad.status_code == 400 and "query" in bad.json()

    detail = reverse("saved-search-detail", args=[data["uuid"]])
    patched = client.patch(
        detail, {"name": "Kilimani rentals", "alerts": False, "query": "deal=sale"}, format="json"
    ).json()
    assert (patched["name"], patched["alerts"], patched["query"]) == (
        "Kilimani rentals",
        False,
        "deal=rent&area=kilimani",
    )
    assert client.get(url).json()[0]["name"] == "Kilimani rentals"
    assert client.delete(detail).status_code == 204
    assert not SavedSearch.objects.filter(user=visitor).exists()


def test_saved_search_limit_and_privacy(client, visitor):
    for i in range(MAX_SAVED_SEARCHES):
        SavedSearch.objects.create(user=visitor, name=f"S{i}", query=f"min_beds={i}")
    full = client.post(reverse("saved-search-list"), {"query": "deal=sale"}, format="json")
    assert full.status_code == 400

    theirs = SavedSearch.objects.create(user=UserFactory(), name="Theirs", query="deal=sale")
    detail = reverse("saved-search-detail", args=[theirs.uuid])
    assert client.patch(detail, {"alerts": False}, format="json").status_code == 404
    assert client.delete(detail).status_code == 404


# ------------------------------------------------------------------ daily alerts


def _saved(user, query="deal=rent", days_ago=1):
    return SavedSearch.objects.create(
        user=user,
        name="Rentals",
        query=query,
        last_alerted_at=timezone.now() - timedelta(days=days_ago),
    )


def test_daily_digest_lists_only_new_matches(visitor):
    saved = _saved(visitor)
    old = PropertyFactory(deal_type="rent", title="Old flat")
    old.published_at = timezone.now() - timedelta(days=3)
    old.save()
    new = PropertyFactory(deal_type="rent", title="New flat", price=80_000, price_unit="per_month")
    PropertyMediaFactory(property=new)
    PropertyFactory(deal_type="sale", title="Not a rental")

    assert send_saved_search_alerts() == 1
    assert len(mail.outbox) == 1
    email = mail.outbox[0]
    assert email.to == [visitor.email]
    assert email.subject == "Alcom Consultants: 1 new property matches your saved search"
    assert "New flat" in email.body and "KES 80,000 / month" in email.body
    assert "Old flat" not in email.body and "Not a rental" not in email.body
    assert f"/properties/{new.slug}" in email.body
    html = email.alternatives[0][0]
    assert "New flat" in html and "res.cloudinary.com" in html
    assert email.extra_headers["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert "/api/v1/alerts/unsubscribe/?token=" in email.extra_headers["List-Unsubscribe"]

    saved.refresh_from_db()
    assert saved.last_alerted_at > timezone.now() - timedelta(minutes=1)
    mail.outbox.clear()
    send_saved_search_alerts()  # nothing new since
    assert mail.outbox == []


def test_unsubscribe_header_survives_smtp_serialisation(visitor, settings):
    """Long header URLs must not be folded into RFC 2047 encoded-words."""
    settings.SITE_URL = "https://alcomconsultants.co.ke"
    _saved(visitor)
    PropertyFactory(deal_type="rent")
    send_saved_search_alerts()
    raw = mail.outbox[0].message(policy=email.policy.SMTP).as_bytes().decode()
    headers = raw.split("\r\n\r\n", 1)[0]
    line = next(h for h in headers.split("\r\n") if h.startswith("List-Unsubscribe:"))
    assert line.startswith(
        "List-Unsubscribe: <https://alcomconsultants.co.ke/api/v1/alerts/unsubscribe/?token="
    )
    assert line.endswith(">") and "=?utf-8?" not in headers


def test_no_digest_for_unverified_or_switched_off(visitor):
    unverified = UserFactory()
    _saved(unverified)
    off = _saved(visitor)
    off.alerts = False
    off.save()
    PropertyFactory(deal_type="rent")
    assert send_saved_search_alerts() == 0
    assert mail.outbox == []


def test_one_digest_covers_several_searches(visitor):
    _saved(visitor, "deal=rent")
    _saved(visitor, "min_beds=4")
    PropertyFactory(deal_type="rent", bedrooms=2)
    PropertyFactory(deal_type="sale", bedrooms=5)
    send_saved_search_alerts()
    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject.endswith("2 new properties match your saved searches")


def test_unsubscribe_link_turns_alerts_off(api, visitor):
    saved = _saved(visitor)
    token = alerts.unsubscribe_token(visitor)
    url = reverse("alerts-unsubscribe")

    assert api.post(url, {"token": token + "x"}, format="json").status_code == 400
    ok = api.post(url, {"token": token}, format="json")
    assert ok.status_code == 200 and ok.json() == {"email": visitor.email}
    saved.refresh_from_db()
    assert saved.alerts is False

    # RFC 8058 one-click: form-encoded body, token in the URL.
    saved.alerts = True
    saved.save()
    one_click = api.post(
        f"{url}?token={token}",
        "List-Unsubscribe=One-Click",
        content_type="application/x-www-form-urlencoded",
    )
    assert one_click.status_code == 200
    saved.refresh_from_db()
    assert saved.alerts is False


def test_search_matching_uses_the_public_filters():
    PropertyFactory(furnishing=Furnishing.FURNISHED, bedrooms=3)
    PropertyFactory(furnishing=Furnishing.SEMI, bedrooms=3)
    PropertyFactory(furnishing=Furnishing.FURNISHED, bedrooms=1, status=Status.DRAFT)
    assert search.matches("furnishing=furnished&min_beds=2").count() == 1
