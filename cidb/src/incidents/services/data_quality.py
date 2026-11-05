from collections import defaultdict
from dataclasses import dataclass, field

from django.db import transaction
from django.db.models import Count, Q, QuerySet

from cidb.src.incidents.models import Cave, Incident, Location, Tag

SAMPLE_SIZE = 5

STATE_ABBREVIATIONS = {
    "al": "alabama",
    "ak": "alaska",
    "az": "arizona",
    "ar": "arkansas",
    "ca": "california",
    "co": "colorado",
    "ct": "connecticut",
    "de": "delaware",
    "fl": "florida",
    "ga": "georgia",
    "hi": "hawaii",
    "id": "idaho",
    "il": "illinois",
    "in": "indiana",
    "ia": "iowa",
    "ks": "kansas",
    "ky": "kentucky",
    "la": "louisiana",
    "me": "maine",
    "md": "maryland",
    "ma": "massachusetts",
    "mi": "michigan",
    "mn": "minnesota",
    "ms": "mississippi",
    "mo": "missouri",
    "mt": "montana",
    "ne": "nebraska",
    "nv": "nevada",
    "nh": "new hampshire",
    "nj": "new jersey",
    "nm": "new mexico",
    "ny": "new york",
    "nc": "north carolina",
    "nd": "north dakota",
    "oh": "ohio",
    "ok": "oklahoma",
    "or": "oregon",
    "pa": "pennsylvania",
    "ri": "rhode island",
    "sc": "south carolina",
    "sd": "south dakota",
    "tn": "tennessee",
    "tx": "texas",
    "ut": "utah",
    "vt": "vermont",
    "va": "virginia",
    "wa": "washington",
    "wv": "west virginia",
    "wi": "wisconsin",
    "wy": "wyoming",
}

COUNTRY_ABBREVIATIONS = {
    "us": "united states",
    "usa": "united states",
    "u.s.": "united states",
    "u.s.a.": "united states",
    "uk": "united kingdom",
}


@dataclass
class Sample:
    kind: str
    id: int
    label: str


@dataclass
class Check:
    key: str
    title: str
    description: str
    count: int
    samples: list[Sample] = field(default_factory=list)


def _normalise(value: str, abbreviations: dict[str, str]) -> str:
    cleaned = " ".join(value.lower().split())
    return abbreviations.get(cleaned, cleaned)


def _text_variants(field_name: str, abbreviations: dict[str, str]) -> Check:
    groups: dict[str, set[str]] = defaultdict(set)
    values = Location.objects.exclude(**{field_name: ""}).values_list(field_name, flat=True)
    for value in values.distinct():
        groups[_normalise(value, abbreviations)].add(value)
    variants = sorted(sorted(group) for group in groups.values() if len(group) > 1)
    label = field_name.removesuffix("_text")
    return Check(
        key=f"{label}_text_variants",
        title=f"{label.capitalize()} text variants",
        description=f"Location {label} values that differ only by case, spacing or abbreviation.",
        count=len(variants),
        samples=[
            Sample(
                kind="location",
                id=Location.objects.filter(**{field_name: group[0]}).values_list("id", flat=True)[
                    0
                ],
                label=" / ".join(group),
            )
            for group in variants[:SAMPLE_SIZE]
        ],
    )


def _queryset_check[M: Incident | Cave | Tag | Location](
    key: str,
    title: str,
    description: str,
    kind: str,
    queryset: QuerySet[M],
    label: str,
) -> Check:
    rows = list(queryset.order_by("id").values_list("id", label)[:SAMPLE_SIZE])
    return Check(
        key=key,
        title=title,
        description=description,
        count=queryset.count(),
        samples=[Sample(kind=kind, id=pk, label=str(text)) for pk, text in rows],
    )


def _duplicate_cave_names() -> Check:
    names = (
        Cave.objects.values("name", "location_id")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
        .order_by("name")
    )
    count = names.count()
    samples = []
    for row in names[:SAMPLE_SIZE]:
        first = Cave.objects.filter(name=row["name"], location_id=row["location_id"]).order_by(
            "id"
        )[0]
        samples.append(Sample(kind="cave", id=first.id, label=f"{row['name']} ({row['n']})"))
    return Check(
        key="duplicate_cave_names",
        title="Duplicate cave names",
        description="Caves sharing both name and location.",
        count=count,
        samples=samples,
    )


def run_checks() -> list[Check]:
    unparsable = Incident.objects.filter(date_year__isnull=True).exclude(date="")
    return [
        _text_variants("country_text", COUNTRY_ABBREVIATIONS),
        _text_variants("state_text", STATE_ABBREVIATIONS),
        _queryset_check(
            "missing_coordinates",
            "Incidents without coordinates",
            "Incidents whose cave location has no latitude or longitude.",
            "incident",
            Incident.objects.filter(
                Q(cave__location__latitude__isnull=True) | Q(cave__location__longitude__isnull=True)
            ),
            "title",
        ),
        _queryset_check(
            "missing_dates",
            "Missing dates",
            "Incidents with an empty date.",
            "incident",
            Incident.objects.filter(date=""),
            "title",
        ),
        _queryset_check(
            "unparsable_dates",
            "Unparsable dates",
            "Incidents whose date does not start with a four digit year.",
            "incident",
            unparsable,
            "title",
        ),
        _queryset_check(
            "empty_summaries",
            "Empty summaries",
            "Incidents with a blank summary.",
            "incident",
            Incident.objects.filter(summary=""),
            "title",
        ),
        _duplicate_cave_names(),
        _queryset_check(
            "single_incident_tags",
            "Tags with one incident",
            "Tags used by exactly one incident.",
            "tag",
            Tag.objects.annotate(n=Count("incidents")).filter(n=1),
            "name",
        ),
        _queryset_check(
            "untagged_incidents",
            "Incidents with no tags",
            "Incidents without any tag.",
            "incident",
            Incident.objects.filter(tags__isnull=True),
            "title",
        ),
    ]


def merge_locations(source: Location, target: Location) -> int:
    if source.pk == target.pk:
        raise ValueError("Source and target locations must differ")
    with transaction.atomic():
        moved = Cave.objects.filter(location=source).update(location=target)
        source.delete()
    return moved
