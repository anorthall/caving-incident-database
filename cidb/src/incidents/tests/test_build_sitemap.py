from pathlib import Path

import pytest
from django.core.management import call_command
from django.test.utils import override_settings

from cidb.src.incidents.models import Incident


@pytest.mark.django_db
def test_build_sitemap_writes_landing_and_incidents(incident: Incident, tmp_path: Path) -> None:
    output = tmp_path / "sitemap.xml"
    call_command("build_sitemap", output=str(output), site_url="https://example.org/")

    content = output.read_text()
    assert "<loc>https://example.org/</loc>" in content
    assert f"<loc>https://example.org/incidents/{incident.pk}</loc>" in content


@pytest.mark.django_db
def test_build_sitemap_uses_setting_path(tmp_path: Path) -> None:
    target = tmp_path / "nested" / "sitemap.xml"
    with override_settings(SITEMAP_PATH=str(target)):
        call_command("build_sitemap")
    assert target.exists()
