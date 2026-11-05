import pytest
from django.test import Client

from cidb.src.incidents.models import Incident, IncidentPerson, Injury, Person

STATS = "/api/v1/incidents/stats"


def rows(client: Client, **params: str | int) -> dict[str, int]:
    resp = client.get(STATS, params)
    assert resp.status_code == 200
    return {r["label"]: r["count"] for r in resp.json()}


@pytest.mark.django_db
class TestStats:
    def test_decade(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="decade") == {
            "1980": 1,
            "1990": 3,
            "2000": 1,
            "2010": 3,
        }

    def test_year_filtered(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="year", states="Oaxaca") == {"2010": 1, "2015": 1}

    def test_tag(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="tag") == {"Flooding": 3, "Rescue": 3, "Rope": 2}

    def test_tag_respects_filters(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="tag", countries="Mexico") == {"Flooding": 1, "Rescue": 1}

    def test_state_omits_blank(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="state") == {"Tennessee": 3, "Kentucky": 2, "Oaxaca": 2}

    def test_country(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert rows(api_client, group_by="country") == {"United States": 6, "Mexico": 2}

    def test_injury_and_age(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        injury = Injury.objects.create(description="Broken leg")
        for incident, age in ((corpus["flood"], 25), (corpus["rope"], 70), (corpus["fall"], 12)):
            involved = IncidentPerson.objects.create(
                incident=incident,
                person=Person.objects.create(),
                age_at_incident=age,
            )
            involved.injuries.add(injury)
        assert rows(api_client, group_by="injury") == {"Broken leg": 3}
        assert rows(api_client, group_by="age_bucket") == {"Under 18": 1, "18-29": 1, "60+": 1}
        assert rows(api_client, group_by="age_bucket", year_to=1990) == {"18-29": 1, "60+": 1}

    def test_empty(self, api_client: Client, db: None) -> None:
        assert rows(api_client, group_by="age_bucket") == {}

    def test_invalid_group_by(self, api_client: Client, db: None) -> None:
        assert api_client.get(STATS, {"group_by": "nope"}).status_code == 422
        assert api_client.get(STATS).status_code == 422
