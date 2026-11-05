from unittest.mock import patch

import pytest
from django.test import Client

from cidb.src.incidents.models import Cave, Incident
from cidb.src.incidents.tests.conftest import MakeIncident

SEARCH = "/api/v1/incidents/search"


def keys(data: dict[str, list[dict[str, int]]], corpus: dict[str, Incident]) -> set[str]:
    by_pk = {incident.pk: key for key, incident in corpus.items()}
    return {by_pk[item["id"]] for item in data["items"]}


@pytest.mark.django_db
class TestFilters:
    def test_country(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"countries": "Mexico"}).json()
        assert keys(data, corpus) == {"delta", "sump"}
        assert data["total"] == 2

    def test_state(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"states": "Kentucky"}).json()
        assert keys(data, corpus) == {"summer", "march"}

    def test_tag(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"tags": "Flooding"}).json()
        assert keys(data, corpus) == {"flood", "summer", "delta"}

    def test_year_range(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"year_from": 1990, "year_to": 1999}).json()
        assert keys(data, corpus) == {"rope", "summer", "march"}

    def test_open_ended_years(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert keys(api_client.get(SEARCH, {"year_from": 2010}).json(), corpus) == {
            "delta",
            "sump",
            "mishap",
        }
        assert keys(api_client.get(SEARCH, {"year_to": 1985}).json(), corpus) == {"flood"}

    def test_year_only_incident_included_for_its_year(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(SEARCH, {"year_from": 1985, "year_to": 1985}).json()
        assert keys(data, corpus) == {"flood"}

    def test_multi_value_is_or_within_dimension(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(SEARCH, {"tags": ["Rope", "Rescue"]}).json()
        assert keys(data, corpus) == {"rope", "summer", "fall", "sump"}
        assert data["total"] == 4

    def test_and_across_dimensions(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(
            SEARCH, {"tags": "Rescue", "countries": "United States", "year_to": "2000"}
        ).json()
        assert keys(data, corpus) == {"summer"}

    def test_combined_with_query(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"q": "rope", "states": "Tennessee"}).json()
        assert keys(data, corpus) == {"rope"}

    def test_filter_only_without_query(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(SEARCH, {"states": "Oaxaca", "sort_by": "relevance"}).json()
        assert keys(data, corpus) == {"delta", "sump"}

    def test_year_from_after_year_to_is_empty(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        resp = api_client.get(SEARCH, {"year_from": 2000, "year_to": 1990})
        assert resp.status_code == 200
        assert resp.json()["items"] == []
        assert resp.json()["total"] == 0

    @pytest.mark.parametrize(
        "params",
        [
            {"year_from": 0},
            {"year_to": 10000},
            {"year_from": "abc"},
            {"tags": [f"t{i}" for i in range(21)]},
            {"states": [f"s{i}" for i in range(21)]},
            {"countries": [f"c{i}" for i in range(21)]},
        ],
    )
    def test_invalid_params_rejected(
        self, api_client: Client, db: None, params: dict[str, str | int | list[str]]
    ) -> None:
        assert api_client.get(SEARCH, params).status_code == 422

    def test_twenty_values_accepted(self, api_client: Client, db: None) -> None:
        resp = api_client.get(SEARCH, {"tags": [f"t{i}" for i in range(20)]})
        assert resp.status_code == 200


@pytest.mark.django_db
class TestPaginationDeterminism:
    def test_ties_have_no_duplicates_or_gaps(
        self, api_client: Client, cave: Cave, make_incident: MakeIncident
    ) -> None:
        created = {make_incident(f"Same year {i}", "2001", cave).pk for i in range(7)}
        seen: list[int] = []
        for page in range(1, 5):
            data = api_client.get(SEARCH, {"page": page, "page_size": 2}).json()
            seen.extend(item["id"] for item in data["items"])
        assert len(seen) == len(set(seen))
        assert set(seen) == created


@pytest.mark.django_db
class TestRecordSearch:
    def test_recorded_on_first_page_only(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        with patch("cidb.src.incidents.api.endpoints.incidents.SearchQuery.record_search") as rec:
            api_client.get(SEARCH, {"q": "rope", "page": "2"})
            rec.assert_not_called()
            api_client.get(SEARCH, {"q": "rope", "page": "1"})
            rec.assert_called_once_with("rope")

    def test_not_recorded_without_query(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        with patch("cidb.src.incidents.api.endpoints.incidents.SearchQuery.record_search") as rec:
            api_client.get(SEARCH, {"states": "Kentucky"})
            rec.assert_not_called()
