from datetime import datetime

from celery import shared_task
from django.utils import timezone

from apps.accounts.models import User

from . import alerts


@shared_task
def send_saved_search_alerts() -> int:
    """Daily (Celery beat): queue one digest per visitor with alerts switched on."""
    now = timezone.now().isoformat()
    users = alerts.recipients()
    for user_id in users:
        send_saved_search_digest.delay(user_id, now)
    return len(users)


@shared_task(bind=True, max_retries=3, default_retry_delay=10 * 60)
def send_saved_search_digest(self, user_id: int, now: str) -> int:  # type: ignore[no-untyped-def]
    """One visitor's digest; retried if the mail server is unreachable."""
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        return 0
    try:
        return alerts.send_digest(user, datetime.fromisoformat(now))
    except OSError as exc:  # SMTP connection problems
        raise self.retry(exc=exc) from exc
