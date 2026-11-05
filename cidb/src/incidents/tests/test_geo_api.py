from decimal import Decimal

import pytest
from django.test import Client

from cidb.src.incidents.models import Cave, Location
from cidb.src.incidents.queries import incidents as incident_queries
from cidb.src.incidents.tests.conftest import MakeIncident

GEO = "/api/v1/incidents/geo"


@pytest.fixture
def located(make_incident: MakeIncident) -> None:
    mapped = Cave.objects.create(
        name="Mapped",
        location=Location.objects.create(
            country_text="United States",
            state_text="Tennessee",
            latitude=Decimal("35.50000"),
            longitude=Decimal("-85.25000"),
        ),
    )
    unmapped = Cave.objects.create(
        name="Unmapped",
        location=Location.objects.create(country_text="Mexico", state_text="Oaxaca"),
    )
    make_incident("Mapped one", "1990-05-12", mapped, ["Rope"])
    make_incident("Mapped two", "2001", mapped)
    make_incident("Unmapped one", "2005", unmapped, ["Rope"])


@pytest.mark.django_db
class TestGeo:
    def test_points_and_counts(self, api_client: Client, located: None) -> None:
        data = api_client.get(GEO).json()
        assert data["total"] == 2
        assert data["without_location"] == 1
        assert [p["title"] for p in data["points"]] == ["Mapped two", "Mapped one"]
        assert data["points"][0]["latitude"] == 35.5
        assert data["points"][0]["longitude"] == -85.25
        assert data["points"][1]["year"] == 1990

    def test_filters_apply(self, api_client: Client, located: None) -> None:
        data = api_client.get(GEO, {"tags": "Rope"}).json()
        assert data["total"] == 1
        assert data["without_location"] == 1
        assert data["points"][0]["title"] == "Mapped one"

    def test_cap(self, api_client: Client, located: None, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(incident_queries, "MAX_MAP_POINTS", 1)
        data = api_client.get(GEO).json()
        assert len(data["points"]) == 1
        assert data["total"] == 2

    def test_empty(self, api_client: Client) -> None:
        data = api_client.get(GEO).json()
        assert data == {"points": [], "total": 0, "without_location": 0}
