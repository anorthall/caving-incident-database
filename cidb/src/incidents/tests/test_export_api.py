import csv
import io
import json

import pytest
from django.http import StreamingHttpResponse
from django.http.response import HttpResponseBase
from django.test import Client

from cidb.src.incidents.api.endpoints import incidents as incidents_module
from cidb.src.incidents.exports.rows import IncidentExportRow
from cidb.src.incidents.exports.writers import stream_csv
from cidb.src.incidents.models import Incident

EXPORT = "/api/v1/incidents/export"

EXPECTED_COLUMNS = [
    "id",
    "title",
    "date",
    "year",
    "cave",
    "country",
    "state",
    "region",
    "latitude",
    "longitude",
    "tags",
    "summary",
    "url",
]


def body(response: HttpResponseBase) -> str:
    assert isinstance(response, StreamingHttpResponse)
    return response.getvalue().decode()


@pytest.mark.django_db
class TestExport:
    def test_csv_columns_pinned(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        response = api_client.get(EXPORT, {"format": "csv"})
        assert response.status_code == 200
        assert response["Content-Type"] == "text/csv"
        assert "attachment" in response["Content-Disposition"]
        reader = csv.DictReader(io.StringIO(body(response)))
        assert reader.fieldnames == EXPECTED_COLUMNS
        assert len(list(reader)) == 8

    def test_json_columns_pinned(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        response = api_client.get(EXPORT, {"format": "json"})
        rows = json.loads(body(response))
        assert len(rows) == 8
        assert list(rows[0]) == EXPECTED_COLUMNS

    def test_filters_applied(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        response = api_client.get(EXPORT, {"format": "json", "countries": "Mexico"})
        rows = json.loads(body(response))
        assert {r["title"] for r in rows} == {"Delta flooding", "Sump dive"}
        assert all(r["country"] == "Mexico" for r in rows)

    def test_row_values(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        response = api_client.get(EXPORT, {"format": "json", "q": "Rope failure"})
        row = json.loads(body(response))[0]
        assert row["year"] == 1990
        assert row["cave"] == "Alpha Cave"
        assert row["state"] == "Tennessee"
        assert row["tags"] == "Rope"
        assert row["url"] == f"/incidents/{corpus['rope'].pk}"

    def test_multiple_tags_joined(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        response = api_client.get(EXPORT, {"format": "csv", "q": "Summer rescue"})
        rows = list(csv.DictReader(io.StringIO(body(response))))
        assert rows[0]["tags"] == "Flooding; Rescue"

    def test_over_cap_returns_400_with_count(
        self,
        api_client: Client,
        corpus: dict[str, Incident],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(incidents_module, "MAX_EXPORT_ROWS", 3)
        response = api_client.get(EXPORT, {"format": "csv"})
        assert response.status_code == 400
        assert "8" in response.json()["detail"]

    def test_invalid_format(self, api_client: Client, corpus: dict[str, Incident]) -> None:
        assert api_client.get(EXPORT, {"format": "xml"}).status_code == 422


def test_csv_neutralises_formula_cells() -> None:
    row = IncidentExportRow(
        id=1,
        title="=HYPERLINK(1)",
        date="",
        year=None,
        cave="+cmd",
        country="",
        state="",
        region="",
        latitude=-12.5,
        longitude=None,
        tags="@x",
        summary="\t-1",
        url="/incidents/1",
    )
    parsed = list(csv.DictReader(io.StringIO("".join(stream_csv([row])))))[0]
    assert parsed["title"] == "'=HYPERLINK(1)"
    assert parsed["cave"] == "'+cmd"
    assert parsed["tags"] == "'@x"
    assert parsed["summary"] == "'\t-1"
    assert parsed["latitude"] == "-12.5"
