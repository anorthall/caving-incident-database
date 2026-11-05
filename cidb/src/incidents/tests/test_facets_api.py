import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from cidb.src.incidents.models import Cave, Incident, IncidentPerson, Injury, Location, Person
from cidb.src.incidents.tests.conftest import MakeIncident

FACETS = "/api/v1/incidents/facets"
SEARCH = "/api/v1/incidents/search"


def as_dict(values: list[dict[str, object]]) -> dict[object, object]:
    return {v["value"]: v["count"] for v in values}


@pytest.mark.django_db
class TestFacets:
    def test_unfiltered_counts(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(FACETS).json()
        assert data["total"] == 8
        assert as_dict(data["countries"]) == {"United States": 6, "Mexico": 2}
        assert as_dict(data["states"]) == {"Tennessee": 3, "Kentucky": 2, "Oaxaca": 2}
        assert as_dict(data["tags"]) == {"Flooding": 3, "Rescue": 3, "Rope": 2}

    def test_blank_state_omitted(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(FACETS).json()
        assert "" not in as_dict(data["states"])

    def test_ordering_by_count_then_value(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS).json()
        assert [v["value"] for v in data["tags"]] == ["Flooding", "Rescue", "Rope"]
        assert [v["value"] for v in data["states"]] == ["Tennessee", "Kentucky", "Oaxaca"]

    def test_disjunctive_counting(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(FACETS, {"states": "Kentucky"}).json()
        assert data["total"] == 2
        assert as_dict(data["states"]) == {"Tennessee": 3, "Kentucky": 2, "Oaxaca": 2}
        assert as_dict(data["countries"]) == {"United States": 2}
        assert as_dict(data["tags"]) == {"Rescue": 1, "Flooding": 1}

    def test_total_matches_search_total(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        cases: list[dict[str, str | int | list[str]]] = [
            {},
            {"q": "rope"},
            {"tags": ["Rope", "Rescue"], "year_from": 1990},
            {"countries": "Mexico", "states": "Kentucky"},
            {"year_from": 2000, "year_to": 1990},
        ]
        for params in cases:
            facets = api_client.get(FACETS, params).json()
            search = api_client.get(SEARCH, params).json()
            assert facets["total"] == search["total"], params

    def test_selected_value_without_matches_present_with_zero(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS, {"tags": "Rope", "states": "Kentucky"}).json()
        assert data["total"] == 0
        assert as_dict(data["tags"]) == {"Flooding": 1, "Rescue": 1, "Rope": 0}
        assert as_dict(data["states"]) == {"Tennessee": 1, "Kentucky": 0}

    def test_unknown_selected_value_present_with_zero(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS, {"tags": "Nonexistent", "countries": "Atlantis"}).json()
        assert as_dict(data["tags"]) == {"Nonexistent": 0}
        assert as_dict(data["countries"]) == {"Atlantis": 0}
        assert data["total"] == 0

    def test_decades_and_year_bounds(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(FACETS).json()
        assert data["decades"] == [
            {"decade": 1980, "count": 1},
            {"decade": 1990, "count": 3},
            {"decade": 2000, "count": 1},
            {"decade": 2010, "count": 3},
        ]
        assert data["year_min"] == 1985
        assert data["year_max"] == 2015

    def test_year_filter_ignored_for_decades_but_not_total(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS, {"year_from": 2010, "year_to": 2015}).json()
        assert data["total"] == 3
        assert data["year_min"] == 1985
        assert sum(d["count"] for d in data["decades"]) == 8

    def test_other_filters_apply_to_decades(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS, {"countries": "Mexico"}).json()
        assert data["decades"] == [{"decade": 2010, "count": 2}]
        assert data["year_min"] == 2010
        assert data["year_max"] == 2015

    def test_empty_database(self, api_client: Client, db: None) -> None:
        data = api_client.get(FACETS).json()
        assert data == {
            "total": 0,
            "countries": [],
            "states": [],
            "tags": [],
            "regions": [],
            "injuries": [],
            "caves": [],
            "publications": [],
            "decades": [],
            "year_min": None,
            "year_max": None,
        }

    def test_query_combines_with_facets(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(FACETS, {"q": "rope"}).json()
        assert data["total"] == 2
        assert as_dict(data["tags"]) == {"Rope": 2, "Rescue": 1}

    def test_caps(
        self, api_client: Client, publication: object, make_incident: MakeIncident
    ) -> None:
        for i in range(25):
            cave = Cave.objects.create(
                name=f"Cave {i}",
                location=Location.objects.create(
                    country_text=f"Country {i:02d}", state_text=f"State {i:02d}"
                ),
            )
            make_incident(f"Incident {i}", "2000", cave, [f"Tag {i:02d}"])
        data = api_client.get(FACETS).json()
        assert len(data["countries"]) == 20
        assert len(data["states"]) == 25
        assert len(data["tags"]) == 25

    def test_selected_value_beyond_cap_is_appended_with_real_count(
        self, api_client: Client, publication: object, make_incident: MakeIncident
    ) -> None:
        for i in range(22):
            cave = Cave.objects.create(
                name=f"Cave {i}",
                location=Location.objects.create(country_text=f"Country {i:02d}"),
            )
            make_incident(f"Incident {i}", "2000", cave)
        data = api_client.get(FACETS, {"countries": "Country 21"}).json()
        assert len(data["countries"]) == 21
        assert data["countries"][-1] == {"value": "Country 21", "count": 1}

    def test_undated_incidents_count_in_total_only(
        self, api_client: Client, cave: Cave, make_incident: MakeIncident
    ) -> None:
        make_incident("Undated", "", cave)
        data = api_client.get(FACETS).json()
        assert data["total"] == 1
        assert data["decades"] == []
        assert data["year_min"] is None
        assert data["year_max"] is None

    def test_query_count(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        with CaptureQueriesContext(connection) as ctx:
            api_client.get(FACETS, {"states": "Kentucky", "q": "cave"})
        incident_queries = [q for q in ctx.captured_queries if "incidents_" in q["sql"]]
        assert len(incident_queries) == 9

    def test_invalid_params_rejected(self, api_client: Client, db: None) -> None:
        assert api_client.get(FACETS, {"year_from": 0}).status_code == 422


@pytest.mark.django_db
class TestPeopleAndEntityFilters:
    def test_cave_and_publication_filters(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        cave_id = corpus["flood"].cave_id
        data = api_client.get(SEARCH, {"caves": [cave_id]}).json()
        assert data["total"] == 3
        pub_id = corpus["flood"].origin_id
        assert api_client.get(SEARCH, {"publications": [pub_id]}).json()["total"] == 8
        facets = api_client.get(FACETS, {"caves": [cave_id]}).json()
        assert {c["name"] for c in facets["caves"]} >= {"Alpha Cave", "Bravo Cave"}
        assert facets["publications"][0]["id"] == pub_id

    def test_region_filter_and_facet(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        location = corpus["flood"].cave.location
        assert location is not None
        location.region_text = "Cumberland"
        location.save()
        data = api_client.get(SEARCH, {"regions": "Cumberland"}).json()
        assert data["total"] == 3
        assert as_dict(api_client.get(FACETS).json()["regions"]) == {"Cumberland": 3}

    def test_injury_filter_facet_and_detail(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        incident = corpus["rope"]
        person = Person.objects.create()
        involvement = IncidentPerson.objects.create(
            incident=incident, person=person, age_at_incident=31
        )
        involvement.injuries.add(Injury.objects.create(description="Broken leg"))
        assert api_client.get(SEARCH, {"injuries": "Broken leg"}).json()["total"] == 1
        assert as_dict(api_client.get(FACETS).json()["injuries"]) == {"Broken leg": 1}
        detail = api_client.get(f"/api/v1/incidents/{incident.pk}").json()
        assert detail["people"] == [{"age_at_incident": 31, "injuries": ["Broken leg"]}]

    def test_has_location(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        location = corpus["flood"].cave.location
        assert location is not None
        location.latitude = 36.1
        location.longitude = -85.2
        location.save()
        assert api_client.get(SEARCH, {"has_location": "true"}).json()["total"] == 3
        assert api_client.get(SEARCH, {"has_location": "false"}).json()["total"] == 5
