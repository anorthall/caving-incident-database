from dataclasses import dataclass
from enum import StrEnum

from django.db.models import (
    Count,
    Exists,
    OuterRef,
    Q,
)

from cidb.src.incidents.models import Cave, Incident, Tag
from cidb.src.incidents.queries.filters import IncidentFilters
from cidb.src.incidents.queries.incidents import IncidentQuery

RELATED_LIMIT = 6
SAME_CAVE_WEIGHT = 4
SHARED_TAG_WEIGHT = 3
SAME_STATE_WEIGHT = 1
CLOSE_YEAR_BONUS = 2
NEAR_YEAR_BONUS = 1
CLOSE_YEAR_SPAN = 2
NEAR_YEAR_SPAN = 10


class BrowseDimension(StrEnum):
    STATE = "state"
    COUNTRY = "country"
    TAG = "tag"
    CAVE = "cave"
    DECADE = "decade"


@dataclass(frozen=True)
class BrowseValue:
    value: str
    count: int
    id: int | None = None


class BrowseQuery:
    @classmethod
    def values(cls, dimension: BrowseDimension) -> list[BrowseValue]:
        match dimension:
            case BrowseDimension.STATE:
                return cls._text_values("cave__location__state_text")
            case BrowseDimension.COUNTRY:
                return cls._text_values("cave__location__country_text")
            case BrowseDimension.TAG:
                return [
                    BrowseValue(value=name, count=count)
                    for name, count in Tag.objects.annotate(count=Count("incidents"))
                    .filter(count__gt=0)
                    .order_by("-count", "name")
                    .values_list("name", "count")
                ]
            case BrowseDimension.CAVE:
                return [
                    BrowseValue(value=name, count=count, id=pk)
                    for pk, name, count in Cave.objects.annotate(count=Count("incidents"))
                    .filter(count__gt=0)
                    .order_by("-count", "name", "pk")
                    .values_list("pk", "name", "count")
                ]
            case BrowseDimension.DECADE:
                decades = IncidentQuery.facets(
                    IncidentFilters(q=None, year_from=None, year_to=None)
                ).decades
                return [BrowseValue(value=str(d.decade), count=d.count) for d in reversed(decades)]

    @staticmethod
    def _text_values(field: str) -> list[BrowseValue]:
        return [
            BrowseValue(value=value, count=count)
            for value, count in Incident.objects.exclude(**{field: ""})
            .order_by()
            .values_list(field)
            .annotate(count=Count("pk"))
            .order_by("-count", field)
        ]

    @classmethod
    def related(cls, incident: Incident) -> list[Incident]:
        tag_ids = list(incident.tags.values_list("pk", flat=True))
        state = incident.cave.location.state_text
        match = Q(cave=incident.cave) | Q(
            Exists(
                Incident.tags.through.objects.filter(incident=OuterRef("pk"), tag_id__in=tag_ids)
            )
        )
        if state:
            match |= Q(cave__location__state_text=state)

        candidates = list(
            Incident.objects.exclude(pk=incident.pk)
            .filter(match)
            .values_list("pk", "cave_id", "cave__location__state_text", "date_year", "view_count")
        )
        shared_tags: dict[int, int] = dict(
            Incident.tags.through.objects.filter(
                tag_id__in=tag_ids, incident_id__in=[c[0] for c in candidates]
            )
            .order_by()
            .values_list("incident_id")
            .annotate(count=Count("pk"))
        )

        def score(candidate: tuple[int, int, str, int | None, int]) -> tuple[int, int, int]:
            pk, cave_id, candidate_state, year, views = candidate
            points = shared_tags.get(pk, 0) * SHARED_TAG_WEIGHT
            if cave_id == incident.cave_id:
                points += SAME_CAVE_WEIGHT
            if state and candidate_state == state:
                points += SAME_STATE_WEIGHT
            if year is not None and incident.date_year is not None:
                gap = abs(year - incident.date_year)
                if gap <= CLOSE_YEAR_SPAN:
                    points += CLOSE_YEAR_BONUS
                elif gap <= NEAR_YEAR_SPAN:
                    points += NEAR_YEAR_BONUS
            return (-points, -views, pk)

        top = [c[0] for c in sorted(candidates, key=score)[:RELATED_LIMIT]]
        by_id = {i.pk: i for i in IncidentQuery.base().filter(pk__in=top)}
        return [by_id[pk] for pk in top]
