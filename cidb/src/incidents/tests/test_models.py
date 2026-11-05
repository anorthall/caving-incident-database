import pytest

from cidb.src.incidents.models import (
    ContentReport,
    Incident,
    ReportReason,
    SearchClick,
    SearchQuery,
)


@pytest.mark.django_db
class TestSearchQuery:
    def test_record_search_creates(self) -> None:
        SearchQuery.record_search("cave rescue")
        assert SearchQuery.objects.filter(query="cave rescue").exists()

    def test_record_search_increments(self) -> None:
        SearchQuery.record_search("cave rescue")
        SearchQuery.record_search("cave rescue")
        sq = SearchQuery.objects.get(query="cave rescue")
        assert sq.query_count == 2

    def test_normalizes_query(self) -> None:
        SearchQuery.record_search("  Cave RESCUE  ")
        assert SearchQuery.objects.filter(query="cave rescue").exists()
        assert not SearchQuery.objects.filter(query="  Cave RESCUE  ").exists()


@pytest.mark.django_db
class TestSearchClick:
    def test_record_click(self, incident: Incident) -> None:
        SearchClick.record_click(query="Cave Test", incident_id=incident.pk, position=3)
        click = SearchClick.objects.first()
        assert click is not None
        assert click.query == "cave test"
        assert click.position == 3
        assert click.incident_id == incident.pk


@pytest.mark.django_db
class TestContentReport:
    def test_str_with_incident(self, content_report: ContentReport) -> None:
        assert "inaccurate" in str(content_report)

    def test_str_without_incident(self, db: None) -> None:
        report = ContentReport.objects.create(
            reason=ReportReason.OTHER,
            description="General feedback",
        )
        assert "General feedback" in str(report)

    def test_default_status(self, db: None) -> None:
        report = ContentReport.objects.create(
            reason=ReportReason.TYPO,
            description="Test",
        )
        assert report.status == "pending"


@pytest.mark.django_db
class TestIncidentDateYear:
    @pytest.mark.parametrize(
        ("date", "year"),
        [
            ("1995", 1995),
            ("1995-summer", 1995),
            ("1995-03", 1995),
            ("1995-03-04", 1995),
            ("", None),
            ("garbage", None),
        ],
    )
    def test_derived_for_each_precision(
        self, incident: Incident, date: str, year: int | None
    ) -> None:
        incident.date = date
        incident.save()
        stored = Incident.objects.values_list("date_year", flat=True).get(pk=incident.pk)
        assert stored == year

    def test_updates_after_queryset_update(self, incident: Incident) -> None:
        Incident.objects.filter(pk=incident.pk).update(date="1987-02")
        incident.refresh_from_db()
        assert incident.date_year == 1987
