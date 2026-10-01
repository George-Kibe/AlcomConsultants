"""Sign-in flows through django-allauth's headless browser API (staff and readers)."""

import re
from urllib.parse import unquote

import pytest
from allauth.mfa.totp.internal.auth import (
    format_hotp_value,
    hotp_value,
    yield_hotp_counters_from_time,
)
from django.urls import reverse
from rest_framework.test import APIClient

from apps.listings.models import Status
from apps.listings.tests.factories import PropertyFactory

from .factories import UserFactory

pytestmark = pytest.mark.django_db

AUTH = "/api/v1/auth/browser/v1"
PASSWORD = "S3cure-pass-123"


def login(client, email, password=PASSWORD):
    return client.post(f"{AUTH}/auth/login", {"email": email, "password": password}, format="json")


def totp_codes(secret):
    return [format_hotp_value(hotp_value(secret, c)) for c in yield_hotp_counters_from_time()]


@pytest.fixture
def staff():
    return UserFactory(email="agent@alcom.test", is_staff=True)


def test_config_and_anonymous_session(api):
    assert api.get(f"{AUTH}/config").status_code == 200
    assert api.get(f"{AUTH}/auth/session").status_code == 401
    assert api.get(reverse("me")).status_code == 403


def test_staff_login_session_me_and_logout(api, staff):
    response = login(api, "Agent@Alcom.test")  # email is case-insensitive
    assert response.status_code == 200, response.json()
    assert response.json()["data"]["user"]["email"] == "agent@alcom.test"

    me = api.get(reverse("me")).json()
    assert me["is_staff"] is True
    assert me["mfa_enabled"] is False
    assert api.get(reverse("dashboard-overview")).status_code == 200

    assert api.delete(f"{AUTH}/auth/session").status_code == 401  # logged out
    assert api.get(reverse("me")).status_code == 403


def test_wrong_password_is_rejected(api, staff):
    response = login(api, staff.email, "wrong-password")
    assert response.status_code == 400
    assert api.get(reverse("me")).status_code == 403


def test_reader_signup_and_email_verification(api, mailoutbox):
    missing_name = api.post(
        f"{AUTH}/auth/signup", {"email": "x@example.com", "password": PASSWORD}, format="json"
    )
    assert missing_name.status_code == 400

    response = api.post(
        f"{AUTH}/auth/signup",
        {"email": "Reader@Example.com", "password": PASSWORD, "name": "  Jane  Wanjiru "},
        format="json",
    )
    assert response.status_code == 200, response.json()  # signed in straight away
    me = api.get(reverse("me")).json()
    assert (me["first_name"], me["last_name"]) == ("Jane", "Wanjiru")
    assert me["is_staff"] is False
    assert (me["email_verified"], me["can_comment"]) == (False, False)
    assert api.get(reverse("dashboard-overview")).status_code == 403

    # The emailed link points at the site's verify page, which posts the key back.
    assert len(mailoutbox) == 1
    match = re.search(r"/account/verify-email/(\S+)", mailoutbox[0].body)
    assert match, mailoutbox[0].body
    assert mailoutbox[0].subject == "Alcom Consultants: Confirm your email address"
    key = unquote(match[1])  # the key is URL-encoded in the link
    verified = api.post(f"{AUTH}/auth/email/verify", {"key": key}, format="json")
    assert verified.status_code == 200, verified.json()
    me = api.get(reverse("me")).json()
    assert (me["email_verified"], me["can_comment"]) == (True, True)


def test_google_sign_in_is_offered_only_when_configured(api, settings):
    providers = api.get(f"{AUTH}/config").json()["data"]["socialaccount"]["providers"]
    assert providers == []
    settings.SOCIALACCOUNT_PROVIDERS = {
        "google": {"APPS": [{"client_id": "id.apps.googleusercontent.com", "secret": "s"}]}
    }
    providers = api.get(f"{AUTH}/config").json()["data"]["socialaccount"]["providers"]
    assert [p["id"] for p in providers] == ["google"]


def test_non_staff_cannot_use_dashboard_api(api):
    UserFactory(email="visitor@example.com")
    assert login(api, "visitor@example.com").status_code == 200
    assert api.get(reverse("me")).json()["is_staff"] is False
    assert api.get(reverse("dashboard-overview")).status_code == 403


def test_overview_counts(api, staff):
    for status in [
        Status.PUBLISHED,
        Status.PUBLISHED,
        Status.DRAFT,
        Status.UNDER_OFFER,
        Status.SOLD,
        Status.LET,
        Status.ARCHIVED,
    ]:
        PropertyFactory(status=status)
    PropertyFactory(status=Status.PUBLISHED, is_featured=True)
    login(api, staff.email)
    assert api.get(reverse("dashboard-overview")).json() == {
        "total": 8,
        "listed": 3,
        "drafts": 1,
        "under_offer": 1,
        "closed": 2,
        "archived": 1,
        "featured": 1,
    }


def test_csrf_is_enforced_for_browser_clients(staff):
    client = APIClient(enforce_csrf_checks=True)
    assert login(client, staff.email).status_code == 403  # no token
    client.get(f"{AUTH}/config")
    token = client.cookies["csrftoken"].value
    response = client.post(
        f"{AUTH}/auth/login",
        {"email": staff.email, "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 200


def test_two_factor_setup_and_login(api, staff, settings):
    settings.MFA_TOTP_TOLERANCE = 1  # allow neighbouring codes so the test can use two
    login(api, staff.email)

    pending = api.get(f"{AUTH}/account/authenticators/totp")
    assert pending.status_code == 404
    secret = pending.json()["meta"]["secret"]
    codes = totp_codes(secret)

    activated = api.post(f"{AUTH}/account/authenticators/totp", {"code": codes[0]}, format="json")
    assert activated.status_code == 200, activated.json()
    assert api.get(reverse("me")).json()["mfa_enabled"] is True

    api.delete(f"{AUTH}/auth/session")
    second_step = login(api, staff.email)
    assert second_step.status_code == 401
    flows = {f["id"]: f for f in second_step.json()["data"]["flows"]}
    assert flows["mfa_authenticate"]["is_pending"] is True
    assert api.get(reverse("me")).status_code == 403  # not signed in yet

    bad = api.post(f"{AUTH}/auth/2fa/authenticate", {"code": "000000"}, format="json")
    assert bad.status_code == 400
    done = api.post(f"{AUTH}/auth/2fa/authenticate", {"code": codes[1]}, format="json")
    assert done.status_code == 200, done.json()
    assert api.get(reverse("me")).json()["email"] == staff.email
