import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from cidb.src.incidents.models import Cave, Incident, Location
from cidb.src.incidents.tests.conftest import MakeIncident


def as_dict(values: list[dict[str, object]]) -> dict[object, object]:
    return {v["value"]: v["count"] for v in values}


@pytest.mark.django_db
class TestBrowse:
    def test_states(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get("/api/v1/browse/state").json()
        assert [v["value"] for v in data] == ["Tennessee", "Kentucky", "Oaxaca"]
        assert as_dict(data) == {"Tennessee": 3, "Kentucky": 2, "Oaxaca": 2}

    def test_countries(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get("/api/v1/browse/country").json()
        assert as_dict(data) == {"United States": 6, "Mexico": 2}

    def test_tags(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get("/api/v1/browse/tag").json()
        assert as_dict(data) == {"Flooding": 3, "Rescue": 3, "Rope": 2}

    def test_caves_include_id(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get("/api/v1/browse/cave").json()
        alpha = corpus["flood"].cave
        assert data[0] == {"value": "Alpha Cave", "count": 3, "id": alpha.pk}
        assert len(data) == 4

    def test_decades_newest_first(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get("/api/v1/browse/decade").json()
        assert [v["value"] for v in data] == ["2010", "2000", "1990", "1980"]
        assert as_dict(data)["1990"] == 3

    def test_unknown_dimension(self, api_client: Client) -> None:
        assert api_client.get("/api/v1/browse/nope").status_code == 422


@pytest.mark.django_db
class TestRelated:
    def url(self, incident: Incident) -> str:
        return f"/api/v1/incidents/{incident.pk}/related"

    def test_excludes_self_and_ranks_by_relevance(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(self.url(corpus["flood"])).json()
        ids = [i["id"] for i in data]
        assert corpus["flood"].pk not in ids
        assert ids[0] == corpus["rope"].pk
        assert corpus["mishap"].pk in ids

    def test_shared_tags_outrank_unrelated(
        self, api_client: Client, make_incident: MakeIncident
    ) -> None:
        location = Location.objects.create(country_text="Canada", state_text="")
        cave_a = Cave.objects.create(name="A", location=location)
        cave_b = Cave.objects.create(name="B", location=location)
        target = make_incident("Target", "2000", cave_a, ["x", "y"])
        one = make_incident("One tag", "2000", cave_b, ["x"])
        two = make_incident("Two tags", "2000", cave_b, ["x", "y"])
        make_incident("Nothing shared", "2000", cave_b, ["z"])
        data = api_client.get(self.url(target)).json()
        assert [i["id"] for i in data] == [two.pk, one.pk]

    def test_same_cave_without_tags(self, api_client: Client, make_incident: MakeIncident) -> None:
        location = Location.objects.create(country_text="Canada", state_text="")
        cave = Cave.objects.create(name="A", location=location)
        target = make_incident("Target", "2000", cave)
        other = make_incident("Other", "1950", cave)
        data = api_client.get(self.url(target)).json()
        assert [i["id"] for i in data] == [other.pk]

    def test_nearby_year_breaks_ties(self, api_client: Client, make_incident: MakeIncident) -> None:
        location = Location.objects.create(country_text="Canada", state_text="BC")
        target = make_incident("Target", "2000", Cave.objects.create(name="T", location=location))
        far = make_incident("Far", "1950", Cave.objects.create(name="F", location=location))
        near = make_incident("Near", "2001", Cave.objects.create(name="N", location=location))
        data = api_client.get(self.url(target)).json()
        assert [i["id"] for i in data] == [near.pk, far.pk]

    def test_limit_of_six(self, api_client: Client, make_incident: MakeIncident) -> None:
        location = Location.objects.create(country_text="Canada", state_text="")
        cave = Cave.objects.create(name="A", location=location)
        target = make_incident("Target", "2000", cave)
        for n in range(8):
            make_incident(f"Other {n}", "2000", cave)
        assert len(api_client.get(self.url(target)).json()) == 6

    def test_no_n_plus_one(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        with CaptureQueriesContext(connection) as ctx:
            api_client.get(self.url(corpus["flood"]))
        assert len(ctx) <= 10

    def test_unknown_incident(self, api_client: Client) -> None:
        assert api_client.get("/api/v1/incidents/999999/related").status_code == 404
