import pytest
from django.test import Client

from cidb.src.incidents.models import Incident

SEARCH = "/api/v1/incidents/search"


def ids(resp_json: dict[str, list[dict[str, int]]]) -> list[int]:
    return [item["id"] for item in resp_json["items"]]


@pytest.mark.django_db
class TestSortModes:
    def test_date_desc_default(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH).json()
        expected = ["sump", "mishap", "delta", "fall", "summer", "march", "rope", "flood"]
        assert ids(data) == [corpus[k].pk for k in expected]

    def test_date_asc(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"sort_order": "asc"}).json()
        expected = ["flood", "rope", "march", "summer", "fall", "delta", "mishap", "sump"]
        assert ids(data) == [corpus[k].pk for k in expected]

    def test_popularity(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"sort_by": "popularity"}).json()
        assert ids(data)[:4] == [corpus[k].pk for k in ["rope", "march", "flood", "delta"]]

    def test_title_asc(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"sort_by": "title", "sort_order": "asc"}).json()
        titles = [item["title"] for item in data["items"]]
        assert titles == sorted(titles)

    def test_cave_name_asc(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"sort_by": "cave_name", "sort_order": "asc"}).json()
        names = [item["cave_name"] for item in data["items"]]
        assert names == sorted(names)

    def test_relevance_without_query_falls_back_to_date(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        by_relevance = api_client.get(SEARCH, {"sort_by": "relevance"}).json()
        by_date = api_client.get(SEARCH).json()
        assert ids(by_relevance) == ids(by_date)
        assert all(item["relevance_score"] is None for item in by_relevance["items"])

    def test_season_sorts_after_numeric_dates_in_same_year(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(SEARCH, {"sort_order": "asc"}).json()
        order = ids(data)
        assert order.index(corpus["march"].pk) < order.index(corpus["summer"].pk)


@pytest.mark.django_db
class TestQueryMatching:
    def test_matches_title(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"q": "sump"}).json()
        assert ids(data) == [corpus["sump"].pk]

    def test_matches_cave_name(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"q": "bravo"}).json()
        assert set(ids(data)) == {corpus["summer"].pk, corpus["march"].pk}

    def test_matches_tag_name(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"q": "rescue"}).json()
        assert {corpus["summer"].pk, corpus["fall"].pk, corpus["sump"].pk} <= set(ids(data))

    def test_cave_and_tag_match_not_duplicated(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        data = api_client.get(SEARCH, {"q": "rope"}).json()
        assert sorted(ids(data)) == sorted([corpus["rope"].pk, corpus["fall"].pk])
        assert data["total"] == 2

    def test_relevance_score_only_for_relevance_sort_with_query(
        self, api_client: Client, corpus: dict[str, Incident]
    ) -> None:
        ranked = api_client.get(SEARCH, {"q": "flooding", "sort_by": "relevance"}).json()
        assert ranked["items"]
        assert all(item["relevance_score"] is not None for item in ranked["items"])
        plain = api_client.get(SEARCH, {"q": "flooding", "sort_by": "date"}).json()
        assert all(item["relevance_score"] is None for item in plain["items"])


@pytest.mark.django_db
class TestPagination:
    def test_bounds_and_total_pages(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"page_size": 3, "page": 3}).json()
        assert data["total"] == 8
        assert data["total_pages"] == 3
        assert len(data["items"]) == 2

    def test_page_past_end_is_empty(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        data = api_client.get(SEARCH, {"page_size": 3, "page": 9}).json()
        assert data["items"] == []
        assert data["total"] == 8
