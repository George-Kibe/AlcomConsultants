import json
import time
from datetime import timedelta
from io import BytesIO
from unittest import mock

import pytest
from django.core import mail, signing
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.enquiries import spam
from apps.enquiries.models import Enquiry, Kind, Note, Stage
from apps.enquiries.tasks import send_follow_up_reminders
from apps.listings.models import Status
from apps.listings.tests.factories import PropertyFactory

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def no_rate_limits(request):
    """Rate limits are tested on their own (marked `throttled`)."""
    cache.clear()
    if request.node.get_closest_marker("throttled"):
        yield
        return
    with mock.patch("apps.enquiries.views._PerIP.allow_request", return_value=True):
        yield


@pytest.fixture(autouse=True)
def no_turnstile(settings):
    """Turnstile is off unless a test turns it on, whatever the local .env says."""
    settings.TURNSTILE_SITE_KEY, settings.TURNSTILE_SECRET_KEY = "", ""


@pytest.fixture(autouse=True)
def emails_on_commit(django_capture_on_commit_callbacks, monkeypatch):
    """Run the on-commit email tasks as soon as each request finishes."""
    from rest_framework.test import APIClient

    original = APIClient.post

    def post(self, *args, **kwargs):
        with django_capture_on_commit_callbacks(execute=True):
            return original(self, *args, **kwargs)

    monkeypatch.setattr(APIClient, "post", post)


def token(age: float = 10) -> str:
    return signing.dumps(time.time() - age, salt=spam.SIGNING_SALT)


def payload(**extra):
    return {
        "kind": "contact",
        "name": "Grace  Achieng",
        "email": "grace@example.com",
        "phone": "0712 345 678",
        "message": "I'd like to sell my house in Karen.",
        "consent": True,
        "form_token": token(),
        "source_path": "/contact",
        **extra,
    }


def send(api, **extra):
    return api.post(reverse("enquiry-create"), payload(**extra), format="json")


@pytest.fixture
def staff_client(api):
    staff = UserFactory(is_staff=True, first_name="Ann", last_name="Otieno")
    api.force_authenticate(staff)
    api.staff = staff
    return api


# ------------------------------------------------------------------ public form


def test_form_config_issues_a_token(api, settings):
    data = api.get(reverse("enquiry-form")).json()
    assert spam.token_problem(data["form_token"]) == "too fast"  # just issued
    assert data["turnstile_site_key"] == ""
    assert data["consent_text"].startswith("I agree")
    assert {"value": "mortgage", "label": "Mortgage or bank loan"} in data["purposes"]

    settings.TURNSTILE_SITE_KEY, settings.TURNSTILE_SECRET_KEY = "site", "secret"
    assert api.get(reverse("enquiry-form")).json()["turnstile_site_key"] == "site"


def test_contact_enquiry_is_saved_and_both_emails_go_out(api, settings):
    settings.ENQUIRY_NOTIFY_EMAILS = ["info@alcomconsultants.co.ke"]
    response = send(api)
    assert response.status_code == 201
    enquiry = Enquiry.objects.get()
    assert response.json() == {"reference": enquiry.reference}
    assert enquiry.reference == f"E-{1000 + enquiry.pk}"
    assert enquiry.name == "Grace Achieng"  # whitespace tidied
    assert enquiry.stage == Stage.NEW and enquiry.consent_at and enquiry.spam_check == "off"
    assert enquiry.user is None

    office, visitor = mail.outbox
    assert office.to == ["info@alcomconsultants.co.ke"]
    assert office.reply_to == ["grace@example.com"]
    assert office.subject == (
        f"Alcom Consultants: General enquiry from Grace Achieng ({enquiry.reference})"
    )
    assert "I'd like to sell my house in Karen." in office.body
    assert f"/dashboard/enquiries/{enquiry.uuid}" in office.body
    assert visitor.to == ["grace@example.com"]
    assert visitor.reply_to == ["info@alcomconsultants.co.ke"]
    assert enquiry.reference in visitor.subject
    assert "Hello Grace" in visitor.body
    assert "sell my house" not in visitor.body  # the message isn't echoed back
    assert "<html" in visitor.alternatives[0][0]


def test_listing_enquiry_records_the_property(api):
    prop = PropertyFactory(title="Garden flat")
    assert send(api, kind="listing", property=prop.slug, message="").status_code == 201
    enquiry = Enquiry.objects.get()
    assert enquiry.property == prop
    assert enquiry.property_label == f"{prop.reference} Garden flat"
    assert f"/properties/{prop.slug}" in mail.outbox[0].body

    prop.status = Status.DRAFT
    prop.save()
    hidden = send(api, kind="listing", property=prop.slug)
    assert hidden.status_code == 400 and "property" in hidden.json()


def test_kind_specific_rules(api):
    errors = send(api, kind="valuation", location="", message="").json()
    assert "location" in errors
    ok = send(api, kind="valuation", location="Kitengela", purpose="mortgage", units=4)
    assert ok.status_code == 201
    valuation = Enquiry.objects.get()
    assert (valuation.purpose, valuation.units) == ("mortgage", None)  # units: management only
    assert "Mortgage or bank loan" in mail.outbox[0].body

    assert "message" in send(api, message="Hi").json()
    assert "property" in send(api, kind="listing").json()
    management = send(api, kind="management", location="Ruaka", units=12, purpose="sale")
    assert management.status_code == 201
    latest = Enquiry.objects.latest("created_at")
    assert (latest.units, latest.purpose) == (12, "")


def test_survey_and_asset_management_enquiries(api):
    survey = send(api, kind="survey", location="", message="Boundary survey please")
    assert "location" in survey.json()
    ok = send(api, kind="survey", location="Ruiru, Kiambu", message="", units=3, purpose="sale")
    assert ok.status_code == 201
    enquiry = Enquiry.objects.get()
    assert (enquiry.kind, enquiry.units, enquiry.purpose) == ("survey", None, "")
    assert "Land survey from Grace Achieng" in mail.outbox[0].subject

    assert "message" in send(api, kind="assets", message="Tags").json()
    assert send(api, kind="assets", message="Tag and value 400 school assets.").status_code == 201


def test_confirmation_uses_the_whatsapp_number(api, settings):
    send(api)
    assert f"https://wa.me/{settings.COMPANY_WHATSAPP}" in mail.outbox[1].body
    assert settings.COMPANY_WHATSAPP == "254181943550"


def test_validation(api):
    errors = send(
        api,
        consent=False,
        name="http://spam.example",
        phone="call me",
        message="see http://a.example http://b.example http://c.example",
    ).json()
    assert set(errors) == {"consent", "name", "phone", "message"}
    assert not Enquiry.objects.exists()


def test_spam_checks(api, settings):
    # Honeypot: looks accepted, nothing saved or sent.
    trap = send(api, website="http://bot.example")
    assert trap.status_code == 201 and trap.json() == {"reference": ""}
    # Too fast, expired or forged tokens are refused.
    assert send(api, form_token=token(age=0)).json()["code"] == "too_fast"
    assert send(api, form_token=token(age=2 * 86400)).json()["code"] == "expired"
    assert send(api, form_token="forged").status_code == 400
    assert not Enquiry.objects.exists() and mail.outbox == []


def _cloudflare(result):
    reply = BytesIO(json.dumps(result).encode())
    return mock.patch("urllib.request.urlopen", return_value=mock.MagicMock(
        __enter__=lambda s: reply, __exit__=lambda *a: None))  # fmt: skip


def test_turnstile(api, settings):
    settings.TURNSTILE_SITE_KEY, settings.TURNSTILE_SECRET_KEY = "site", "secret"
    with _cloudflare({"success": False, "error-codes": ["invalid-input-response"]}):
        refused = send(api, turnstile_token="bad")
    assert refused.status_code == 400 and "security check" in refused.json()["detail"]
    assert send(api).status_code == 400  # no token at all

    with _cloudflare({"success": True}) as urlopen:
        assert send(api, turnstile_token="good").status_code == 201
    sent = urlopen.call_args.args[0]
    assert sent.full_url == spam.VERIFY_URL and b"secret=secret" in sent.data
    assert Enquiry.objects.get().spam_check == "passed"

    with mock.patch("urllib.request.urlopen", side_effect=TimeoutError):
        assert send(api, turnstile_token="x").status_code == 201  # never lose a lead
    assert Enquiry.objects.latest("created_at").spam_check == "unverified"


def test_signed_in_visitors_are_linked_and_see_enquiries_in_their_export(api):
    visitor = UserFactory()
    api.force_authenticate(visitor)
    send(api)
    enquiry = Enquiry.objects.get()
    assert enquiry.user == visitor
    exported = json.loads(api.get(reverse("me-export")).content)
    assert exported["enquiries"][0]["reference"] == enquiry.reference

    visitor.delete()  # the lead stays with the office
    enquiry.refresh_from_db()
    assert enquiry.user is None and enquiry.email == "grace@example.com"


# ------------------------------------------------------------------ dashboard


def test_dashboard_is_staff_only(api):
    api.force_authenticate(UserFactory())
    assert api.get(reverse("dashboard-enquiry-list")).status_code == 403


def test_pipeline_updates_are_recorded_on_the_timeline(staff_client):
    send(staff_client)
    enquiry = Enquiry.objects.get()
    colleague = UserFactory(is_staff=True, first_name="Brian", last_name="Mwangi")
    detail = reverse("dashboard-enquiry-detail", args=[enquiry.uuid])
    day = timezone.localdate() + timedelta(days=2)

    data = staff_client.patch(
        detail,
        {"stage": "contacted", "assigned_to": colleague.pk, "follow_up_on": day.isoformat()},
        format="json",
    ).json()
    assert data["assigned_to_name"] == "Brian Mwangi"
    events = [n["body"] for n in data["notes"]]
    assert events[0] == "Stage changed from New to Contacted."
    assert events[1] == "Assigned to Brian Mwangi."
    assert events[2].startswith("Follow-up set for ")
    assert all(n["is_system"] and n["author_name"] == "Ann Otieno" for n in data["notes"])

    customer = UserFactory()  # not staff: can't be assigned
    bad = staff_client.patch(detail, {"assigned_to": customer.pk}, format="json")
    assert bad.status_code == 400

    note = staff_client.post(
        reverse("dashboard-enquiry-notes", args=[enquiry.uuid]),
        {"body": "Called, viewing on Saturday."},
        format="json",
    )
    assert note.status_code == 201 and note.json()["is_system"] is False

    won = staff_client.patch(detail, {"stage": "won"}, format="json").json()
    assert won["closed_at"] and won["notes"][-1]["body"] == "Stage changed from Contacted to Won."
    reopened = staff_client.patch(detail, {"stage": "negotiating"}, format="json").json()
    assert reopened["closed_at"] is None
    # Contact details sent by the visitor are read-only.
    staff_client.patch(detail, {"email": "x@y.z", "message": "edited"}, format="json")
    enquiry.refresh_from_db()
    assert (enquiry.email, enquiry.message) == ("grace@example.com", payload()["message"])


def test_list_filters_and_summary(staff_client):
    me = staff_client.staff
    today = timezone.localdate()

    def lead(**fields):
        defaults = {"kind": Kind.CONTACT, "name": "Lead", "email": "l@example.com",
                    "consent_at": timezone.now()}  # fmt: skip
        return Enquiry.objects.create(**{**defaults, **fields})

    new = lead(name="Wanjiru")
    mine_due = lead(stage=Stage.CONTACTED, assigned_to=me, follow_up_on=today)
    overdue = lead(stage=Stage.VIEWING, follow_up_on=today - timedelta(days=3))
    lead(stage=Stage.WON, follow_up_on=today - timedelta(days=1))  # closed: never due
    spam_lead = lead(is_spam=True)
    url = reverse("dashboard-enquiry-list")

    def uuids(**params):
        return {r["uuid"] for r in staff_client.get(url, params).json()["results"]}

    assert str(spam_lead.uuid) not in uuids()
    assert uuids(spam="true") == {str(spam_lead.uuid)}
    assert uuids(stage="open") == {str(new.uuid), str(mine_due.uuid), str(overdue.uuid)}
    assert uuids(assigned="me") == {str(mine_due.uuid)}
    assert uuids(due="true") == {str(mine_due.uuid), str(overdue.uuid)}
    assert uuids(q="wanjiru") == {str(new.uuid)}
    assert uuids(q=overdue.reference) == {str(overdue.uuid)}
    rows = staff_client.get(url, {"due": "true"}).json()["results"]
    assert rows[0]["uuid"] == str(overdue.uuid) and rows[0]["is_overdue"] is True

    summary = staff_client.get(reverse("dashboard-enquiry-summary")).json()
    assert summary["stages"] == {"new": 1, "contacted": 1, "viewing": 1, "negotiating": 0,
                                 "won": 1, "lost": 0}  # fmt: skip
    assert (summary["open"], summary["new"], summary["due"], summary["overdue"]) == (3, 1, 2, 1)
    assert (summary["unassigned"], summary["mine"], summary["spam"]) == (2, 1, 1)


def test_follow_up_reminders(staff_client, settings):
    settings.ENQUIRY_NOTIFY_EMAILS = ["info@alcomconsultants.co.ke"]
    agent = UserFactory(is_staff=True, email="agent@alcomconsultants.co.ke")
    today = timezone.localdate()
    common = {"kind": Kind.LISTING, "email": "l@example.com", "consent_at": timezone.now()}
    Enquiry.objects.create(name="Due lead", assigned_to=agent, follow_up_on=today, **common)
    Enquiry.objects.create(
        name="Late lead", assigned_to=agent, follow_up_on=today - timedelta(days=2), **common
    )
    Enquiry.objects.create(name="Nobody's lead", follow_up_on=today, **common)
    Enquiry.objects.create(name="Later", assigned_to=agent, follow_up_on=today + timedelta(1),
                           **common)  # fmt: skip
    Enquiry.objects.create(name="Done", stage=Stage.LOST, follow_up_on=today, **common)

    assert send_follow_up_reminders() == 2
    by_recipient = {m.to[0]: m for m in mail.outbox}
    agent_mail = by_recipient["agent@alcomconsultants.co.ke"]
    assert agent_mail.subject == "Alcom Consultants: 2 follow-ups due today"
    assert "Late lead" in agent_mail.body and "overdue since" in agent_mail.body
    assert "Later" not in agent_mail.body and "Done" not in agent_mail.body
    office = by_recipient["info@alcomconsultants.co.ke"]
    assert "Nobody's lead" in office.body and "nobody is assigned" in office.body


@pytest.mark.throttled
def test_forms_are_rate_limited_per_ip(api):
    codes = [send(api).status_code for _ in range(6)]
    assert codes == [201] * 5 + [429]


def test_staff_can_delete_an_enquiry(staff_client):
    send(staff_client)
    enquiry = Enquiry.objects.get()
    Note.objects.create(enquiry=enquiry, body="x")
    detail = reverse("dashboard-enquiry-detail", args=[enquiry.uuid])
    assert staff_client.delete(detail).status_code == 204
    assert not Enquiry.objects.exists() and not Note.objects.exists()
