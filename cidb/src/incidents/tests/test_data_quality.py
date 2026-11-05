from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client

from cidb.src.core.models.user import ACAUser
from cidb.src.incidents.models import Cave, Incident, Location, Tag
from cidb.src.incidents.services.data_quality import merge_locations, run_checks
from cidb.src.incidents.tests.conftest import MakeIncident


def counts() -> dict[str, int]:
    return {c.key: c.count for c in run_checks()}


@pytest.mark.django_db
def test_state_and_country_variants() -> None:
    Location.objects.create(country_text="United States", state_text="KY")
    Location.objects.create(country_text="USA", state_text="Kentucky")
    result = counts()
    assert result["state_text_variants"] == 1
    assert result["country_text_variants"] == 1


@pytest.mark.django_db
def test_incident_checks(cave: Cave, make_incident: MakeIncident) -> None:
    make_incident("Good", "2020-01-01", cave, tags=["a"])
    make_incident("NoDate", "", cave)
    make_incident("Bad", "sometime", cave, tags=["b", "a"])
    Incident.objects.filter(title="Good").update(summary="")
    result = counts()
    assert result["missing_dates"] == 1
    assert result["unparsable_dates"] == 1
    assert result["empty_summaries"] == 1
    assert result["untagged_incidents"] == 1
    assert result["single_incident_tags"] == 1
    assert result["missing_coordinates"] == 3


@pytest.mark.django_db
def test_duplicate_caves(location: Location) -> None:
    Cave.objects.create(name="Dup", location=location)
    Cave.objects.create(name="Dup", location=location)
    check = next(c for c in run_checks() if c.key == "duplicate_cave_names")
    assert check.count == 1
    assert check.samples[0].kind == "cave"


@pytest.mark.django_db
def test_report_command(cave: Cave) -> None:
    out = StringIO()
    call_command("report_data_quality", stdout=out)
    assert "Missing dates: 0" in out.getvalue()


@pytest.mark.django_db
def test_merge_locations_command_dry_run_and_apply(location: Location, cave: Cave) -> None:
    target = Location.objects.create(country_text="United States", state_text="VA")
    out = StringIO()
    call_command("merge_locations", location.pk, target.pk, stdout=out)
    assert "Dry run" in out.getvalue()
    assert Location.objects.filter(pk=location.pk).exists()
    call_command("merge_locations", location.pk, target.pk, "--apply", stdout=out)
    cave.refresh_from_db()
    assert cave.location_id == target.pk
    assert not Location.objects.filter(pk=location.pk).exists()


@pytest.mark.django_db
def test_merge_locations_errors(location: Location) -> None:
    with pytest.raises(ValueError):
        merge_locations(location, location)
    with pytest.raises(CommandError):
        call_command("merge_locations", location.pk, 999999)
    with pytest.raises(CommandError):
        call_command("merge_locations", location.pk, location.pk, "--apply")


class TestDataQualityApi:
    def test_staff(self, staff_client: Client, cave: Cave) -> None:
        resp = staff_client.get("/api/v1/staff/data-quality")
        assert resp.status_code == 200
        keys = [c["key"] for c in resp.json()]
        assert "missing_dates" in keys and "untagged_incidents" in keys

    def test_editor(self, editor_client: Client, db: None) -> None:
        assert editor_client.get("/api/v1/staff/data-quality").status_code == 200

    def test_anonymous(self, api_client: Client, db: None) -> None:
        assert api_client.get("/api/v1/staff/data-quality").status_code == 401


@pytest.mark.django_db
def test_admin_changelists_and_actions(
    staff_user: ACAUser, cave: Cave, make_incident: MakeIncident
) -> None:
    staff_user.is_superuser = True
    staff_user.save()
    admin_client = Client()
    admin_client.force_login(staff_user)
    incident = make_incident("X", "2020", cave, tags=["t1"])
    t2 = Tag.objects.create(name="t2")
    incident.tags.add(t2)
    for path in ("incident", "cave", "location", "tag"):
        resp = admin_client.get(f"/admin/incidents/{path}/")
        assert resp.status_code == 200
    assert admin_client.get("/admin/incidents/incident/?date_year=2020").status_code == 200
    assert admin_client.get("/admin/incidents/incident/?date_year=none").status_code == 200
    admin_client.post(
        "/admin/incidents/incident/",
        {"action": "mark_for_review", "_selected_action": [incident.pk]},
    )
    assert incident.tags.filter(name="needs-review").exists()
    t1 = Tag.objects.get(name="t1")
    admin_client.post(
        "/admin/incidents/tag/",
        {"action": "merge_tags", "_selected_action": [t1.pk, t2.pk]},
    )
    assert not Tag.objects.filter(pk=t2.pk).exists()
    assert incident.tags.filter(pk=t1.pk).exists()
