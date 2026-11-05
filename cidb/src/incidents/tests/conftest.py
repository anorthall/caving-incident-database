from collections.abc import Callable

import pytest

from cidb.src.incidents.models import Cave, Incident, Location, Publication, Tag

MakeIncident = Callable[..., Incident]


@pytest.fixture
def make_incident(publication: Publication) -> MakeIncident:
    def _make(
        title: str,
        date: str,
        cave: Cave,
        tags: list[str] | None = None,
        view_count: int = 0,
    ) -> Incident:
        incident = Incident.objects.create(
            title=title,
            date=date,
            cave=cave,
            origin=publication,
            summary=f"{title} summary",
            view_count=view_count,
        )
        for name in tags or []:
            tag, _ = Tag.objects.get_or_create(name=name)
            incident.tags.add(tag)
        return incident

    return _make


@pytest.fixture
def corpus(make_incident: MakeIncident) -> dict[str, Incident]:
    alpha = Cave.objects.create(
        name="Alpha Cave",
        location=Location.objects.create(country_text="United States", state_text="Tennessee"),
    )
    bravo = Cave.objects.create(
        name="Bravo Cave",
        location=Location.objects.create(country_text="United States", state_text="Kentucky"),
    )
    hollow = Cave.objects.create(
        name="Rope Hollow",
        location=Location.objects.create(country_text="United States", state_text=""),
    )
    delta = Cave.objects.create(
        name="Delta Cave",
        location=Location.objects.create(country_text="Mexico", state_text="Oaxaca"),
    )
    return {
        "flood": make_incident("Flood in Alpha", "1985", alpha, ["Flooding"], view_count=5),
        "rope": make_incident("Rope failure", "1990-05-12", alpha, ["Rope"], view_count=50),
        "summer": make_incident("Summer rescue", "1995-summer", bravo, ["Rescue", "Flooding"]),
        "march": make_incident("Lost light", "1995-03", bravo, view_count=10),
        "fall": make_incident("Fall at the hollow", "2005-07-04", hollow, ["Rope", "Rescue"]),
        "delta": make_incident("Delta flooding", "2010", delta, ["Flooding"], view_count=1),
        "sump": make_incident("Sump dive", "2015-11-30", delta, ["Rescue"]),
        "mishap": make_incident("Alpha mishap", "2015-02-02", alpha),
    }
