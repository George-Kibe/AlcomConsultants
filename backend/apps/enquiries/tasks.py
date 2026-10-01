"""Enquiry emails, sent by the Celery worker so a slow or down mail server never
affects the visitor submitting a form."""

import logging
from collections import defaultdict

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.core.emails import send_branded

from .models import Enquiry, Kind

logger = logging.getLogger(__name__)
RETRY = {"bind": True, "max_retries": 5, "default_retry_delay": 5 * 60}


def _dashboard_url(enquiry: Enquiry) -> str:
    return f"{settings.SITE_URL}/dashboard/enquiries/{enquiry.uuid}"


def _summary(enquiry: Enquiry) -> list[tuple[str, str]]:
    """Label/value rows describing the enquiry (only the ones that apply)."""
    rows = [
        ("Type", enquiry.get_kind_display()),
        ("Property", enquiry.property_label),
        ("Property type", enquiry.property_type),
        ("Location", enquiry.location),
        ("Purpose", enquiry.get_purpose_display() if enquiry.purpose else ""),
        ("Units", str(enquiry.units) if enquiry.units else ""),
    ]
    return [(label, value) for label, value in rows if value]


@shared_task(**RETRY)
def notify_staff(self, enquiry_id: int) -> None:  # type: ignore[no-untyped-def]
    """Tell the office about a new enquiry; replying goes straight to the visitor."""
    enquiry = Enquiry.objects.select_related("property").get(pk=enquiry_id)
    try:
        send_branded(
            subject=f"{enquiry.get_kind_display()} from {enquiry.name} ({enquiry.reference})",
            template="enquiries/email/new_enquiry",
            context={
                "enquiry": enquiry,
                "rows": _summary(enquiry),
                "dashboard_url": _dashboard_url(enquiry),
                "property_url": f"{settings.SITE_URL}/properties/{enquiry.property.slug}"
                if enquiry.property
                else "",
            },
            to=settings.ENQUIRY_NOTIFY_EMAILS,
            reply_to=[enquiry.email],
        )
    except OSError as exc:
        raise self.retry(exc=exc) from exc


@shared_task(**RETRY)
def acknowledge(self, enquiry_id: int) -> None:  # type: ignore[no-untyped-def]
    """Confirm receipt to the visitor. Their message isn't repeated back, so the form
    can't be used to send arbitrary text to someone else's address."""
    enquiry = Enquiry.objects.get(pk=enquiry_id)
    try:
        send_branded(
            subject=f"We received your enquiry ({enquiry.reference})",
            template="enquiries/email/acknowledgement",
            context={
                "enquiry": enquiry,
                "first_name": enquiry.name.split()[0] if enquiry.name.split() else "",
                "is_listing": enquiry.kind == Kind.LISTING,
                "whatsapp": settings.COMPANY_WHATSAPP,
                "phone": settings.COMPANY_PHONE,
            },
            to=[enquiry.email],
            reply_to=settings.ENQUIRY_NOTIFY_EMAILS[:1],
        )
    except OSError as exc:
        raise self.retry(exc=exc) from exc


@shared_task
def send_follow_up_reminders() -> int:
    """Daily (Celery beat): each assignee gets one email listing their leads due for a
    follow-up; due leads nobody is assigned to go to the office inbox."""
    today = timezone.localdate()
    due = Enquiry.objects.due(today).select_related("assigned_to").order_by("follow_up_on")
    groups: dict[str, list[Enquiry]] = defaultdict(list)
    for enquiry in due:
        owner = enquiry.assigned_to
        key = owner.email if owner and owner.is_active else ""
        groups[key].append(enquiry)
    for email, enquiries in groups.items():
        recipients = [email] if email else settings.ENQUIRY_NOTIFY_EMAILS
        send_branded(
            subject=f"{len(enquiries)} follow-up{'s' if len(enquiries) > 1 else ''} due today",
            template="enquiries/email/follow_ups",
            context={
                "unassigned": not email,
                "today": today,
                "leads": [
                    {
                        "enquiry": e,
                        "overdue": e.follow_up_on is not None and e.follow_up_on < today,
                        "url": _dashboard_url(e),
                    }
                    for e in enquiries
                ],
                "list_url": f"{settings.SITE_URL}/dashboard/enquiries?due=1",
            },
            to=recipients,
        )
    logger.info("Follow-up reminders: %s leads, %s emails", due.count(), len(groups))
    return len(groups)
