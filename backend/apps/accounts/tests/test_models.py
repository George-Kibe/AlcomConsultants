import pytest

from apps.accounts.models import User

from .factories import UserFactory

pytestmark = pytest.mark.django_db


def test_create_user_normalises_email():
    user = User.objects.create_user("Jane@Example.COM", "S3cure-pass-123")

    assert user.email == "jane@example.com"
    assert user.check_password("S3cure-pass-123")
    assert not user.is_staff
    assert not user.is_superuser
    assert user.uuid is not None


def test_create_user_requires_email():
    with pytest.raises(ValueError, match="email"):
        User.objects.create_user("", "S3cure-pass-123")


def test_create_superuser():
    admin = User.objects.create_superuser("admin@example.com", "S3cure-pass-123")

    assert admin.is_staff
    assert admin.is_superuser


def test_create_superuser_rejects_non_staff():
    with pytest.raises(ValueError, match="is_staff"):
        User.objects.create_superuser("admin@example.com", "x", is_staff=False)


def test_names():
    user = UserFactory.build(first_name="Jane", last_name="Wanjiku", email="j@example.com")

    assert str(user) == "j@example.com"
    assert user.get_full_name() == "Jane Wanjiku"
    assert user.get_short_name() == "Jane"
