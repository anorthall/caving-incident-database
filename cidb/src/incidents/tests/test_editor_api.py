import pytest
from django.test import Client

from cidb.src.core.models import ACAUser
from cidb.src.incidents.models import ContentReport, Incident, IncidentRevision
from cidb.src.incidents.services.editor import IncidentEdit, IncidentEditError, IncidentEditor


def patch(client: Client, incident_id: int, body: dict[str, object]) -> int:
    return client.patch(
        f"/api/v1/staff/incidents/{incident_id}", data=body, content_type="application/json"
    ).status_code


@pytest.mark.django_db
class TestPatchAuth:
    def test_anonymous(self, api_client: Client, incident: Incident) -> None:
        status = patch(api_client, incident.pk, {"title": "x"})
        assert status == 401
        incident.refresh_from_db()
        assert incident.title == "Test Cave Incident"

    def test_non_editor(
        self, api_client: Client, regular_user: ACAUser, incident: Incident
    ) -> None:
        api_client.force_login(regular_user)
        status = patch(api_client, incident.pk, {"title": "x"})
        assert status == 401
        assert IncidentRevision.objects.count() == 0

    def test_revisions_anonymous(self, api_client: Client, incident: Incident) -> None:
        assert api_client.get(f"/api/v1/staff/incidents/{incident.pk}/revisions").status_code == 401

    def test_revisions_non_editor(
        self, api_client: Client, regular_user: ACAUser, incident: Incident
    ) -> None:
        api_client.force_login(regular_user)
        assert api_client.get(f"/api/v1/staff/incidents/{incident.pk}/revisions").status_code == 401

    def test_pending_count_anonymous(self, api_client: Client, db: None) -> None:
        assert api_client.get("/api/v1/staff/feedback/pending-count/").status_code == 401


@pytest.mark.django_db
class TestPatch:
    def test_editor_updates_and_records_revision(
        self, editor_client: Client, incident: Incident
    ) -> None:
        status = patch(
            editor_client,
            incident.pk,
            {"title": "New title", "date": "2024-07", "tags": ["Rope", "Flood"], "analysis": "A"},
        )
        assert status == 200
        revision = IncidentRevision.objects.get()
        assert revision.changes["title"] == {
            "before": "Test Cave Incident",
            "after": "New title",
        }
        assert revision.changes["tags"]["after"] == ["Flood", "Rope"]
        assert revision.editor is not None

    def test_staff_can_update(self, staff_client: Client, incident: Incident) -> None:
        assert patch(staff_client, incident.pk, {"summary": "S"}) == 200

    def test_no_change_records_nothing(self, editor_client: Client, incident: Incident) -> None:
        patch(editor_client, incident.pk, {"title": incident.title})
        assert IncidentRevision.objects.count() == 0

    def test_invalid_date_is_atomic(self, editor_client: Client, incident: Incident) -> None:
        status = patch(editor_client, incident.pk, {"title": "Changed", "date": "nonsense"})
        assert status == 422
        incident.refresh_from_db()
        assert incident.title == "Test Cave Incident"
        assert IncidentRevision.objects.count() == 0

    def test_empty_title_rejected(self, editor_client: Client, incident: Incident) -> None:
        assert patch(editor_client, incident.pk, {"title": "  "}) == 422

    def test_not_found(self, editor_client: Client, db: None) -> None:
        assert patch(editor_client, 99999, {"title": "x"}) == 404

    def test_revisions_listed(self, editor_client: Client, incident: Incident) -> None:
        patch(editor_client, incident.pk, {"title": "One"})
        patch(editor_client, incident.pk, {"title": "Two"})
        resp = editor_client.get(f"/api/v1/staff/incidents/{incident.pk}/revisions")
        data = resp.json()
        assert resp.status_code == 200
        assert [r["changes"]["title"]["after"] for r in data] == ["Two", "One"]
        assert data[0]["editor_name"] == "Editor User"


@pytest.mark.django_db
class TestEditorService:
    def test_long_title(self, editor_user: ACAUser, incident: Incident) -> None:
        with pytest.raises(IncidentEditError):
            IncidentEditor(editor_user).update(incident.pk, IncidentEdit(title="x" * 101))


@pytest.mark.django_db
class TestPendingCount:
    def test_counts_pending(self, editor_client: Client, content_report: ContentReport) -> None:
        resp = editor_client.get("/api/v1/staff/feedback/pending-count/")
        assert resp.status_code == 200
        assert resp.json() == {"count": 1}
