from django.core import mail


def test_default_mailer_sends_email(mailoutbox):
    mail.send_mail("Subject", "Body", None, ["client@example.com"])

    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["client@example.com"]
    assert mailoutbox[0].from_email.endswith("<noreply@alcomconsultants.co.ke>")
