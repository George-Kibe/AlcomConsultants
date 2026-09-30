from unittest import mock

import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_ok(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": True, "cache": True}


@pytest.mark.django_db
def test_health_reports_cache_failure(client):
    with mock.patch("apps.core.views.cache.set", side_effect=ConnectionError):
        response = client.get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["cache"] is False


@pytest.mark.django_db
def test_health_reports_database_failure(client):
    with mock.patch("apps.core.views.connection.cursor", side_effect=Exception):
        response = client.get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["database"] is False
