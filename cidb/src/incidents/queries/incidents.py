from collections import Counter
from dataclasses import dataclass
from enum import StrEnum

from django.contrib.postgres.search import SearchQuery as PgSearchQuery
from django.contrib.postgres.search import SearchRank
from django.db.models import Count, Exists, F, Model, OuterRef, Q, QuerySet
from django.db.models.functions import Ln

from cidb.src.incidents.models import Incident, IncidentPerson
from cidb.src.incidents.queries.filters import IncidentFilters

MAX_COUNTRY_FACETS = 20
MAX_STATE_FACETS = 60
MAX_TAG_FACETS = 40
MAX_REGION_FACETS = 60
MAX_INJURY_FACETS = 40
MAX_ENTITY_FACETS = 40
MAX_STAT_ROWS = 15
AGE_BUCKETS = (
    (0, 17, "Under 18"),
    (18, 29, "18-29"),
    (30, 39, "30-39"),
    (40, 49, "40-49"),
    (50, 59, "50-59"),
)
AGE_BUCKET_OVER = "60+"


class SortBy(StrEnum):
    DATE = "date"
    RELEVANCE = "relevance"
    POPULARITY = "popularity"
    TITLE = "title"
    CAVE_NAME = "cave_name"


class Dimension(StrEnum):
    COUNTRIES = "countries"
    STATES = "states"
    TAGS = "tags"
    CAVES = "caves"
    REGIONS = "regions"
    INJURIES = "injuries"
    PUBLICATIONS = "publications"
    YEARS = "years"


class GroupBy(StrEnum):
    YEAR = "year"
    DECADE = "decade"
    TAG = "tag"
    STATE = "state"
    COUNTRY = "country"
    INJURY = "injury"
    AGE_BUCKET = "age_bucket"


@dataclass(frozen=True)
class StatRow:
    label: str
    count: int


@dataclass(frozen=True)
class IncidentPageResult:
    total: int
    incidents: list[Incident]
    relevance: dict[int, float]


@dataclass(frozen=True)
class FacetValue:
    value: str
    count: int


@dataclass(frozen=True)
class EntityFacet:
    id: int
    name: str
    count: int


@dataclass(frozen=True)
class DecadeFacet:
    decade: int
    count: int


@dataclass(frozen=True)
class IncidentFacets:
    total: int
    countries: list[FacetValue]
    states: list[FacetValue]
    tags: list[FacetValue]
    regions: list[FacetValue]
    injuries: list[FacetValue]
    caves: list[EntityFacet]
    publications: list[EntityFacet]
    decades: list[DecadeFacet]
    year_min: int | None
    year_max: int | None


class IncidentQuery:
    @classmethod
    def base(cls) -> QuerySet[Incident]:
        return (
            Incident.objects.only(
                "id",
                "title",
                "date",
                "summary",
                "view_count",
                "cave__id",
                "cave__name",
                "cave__location__id",
                "cave__location__country_text",
                "cave__location__state_text",
                "cave__location__region_text",
                "search_vector",
            )
            .select_related("cave", "cave__location")
            .prefetch_related("tags")
        )

    @classmethod
    def apply(cls, queryset: QuerySet[Incident], filters: IncidentFilters) -> QuerySet[Incident]:
        return cls._apply(queryset, filters, frozenset())

    @classmethod
    def order(
        cls,
        queryset: QuerySet[Incident],
        filters: IncidentFilters,
        sort_by: SortBy | None,
        sort_order: str,
    ) -> QuerySet[Incident]:
        prefix = "" if sort_order == "asc" else "-"
        if sort_by == SortBy.RELEVANCE and filters.q:
            return cls._rank(queryset, filters.q).order_by(f"{prefix}relevance", "-date", "id")
        keys: tuple[str, ...]
        match sort_by:
            case SortBy.POPULARITY:
                keys = (f"{prefix}view_count", "-date")
            case SortBy.TITLE:
                keys = (f"{prefix}title", "-date")
            case SortBy.CAVE_NAME:
                keys = (f"{prefix}cave__name", "-date")
            case _:
                keys = (f"{prefix}date",)
        return queryset.order_by(*keys, "id")

    @classmethod
    def list_page(
        cls,
        filters: IncidentFilters,
        sort_by: SortBy | None,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> IncidentPageResult:
        queryset = cls.apply(cls.base(), filters)
        total = queryset.count()
        offset = (page - 1) * page_size
        ordered = cls.order(queryset, filters, sort_by, sort_order)[offset : offset + page_size]
        incidents = list(ordered)
        relevance: dict[int, float] = {}
        if sort_by == SortBy.RELEVANCE and filters.q:
            relevance = {i.pk: round(cls._relevance_of(i), 2) for i in incidents}
        return IncidentPageResult(total=total, incidents=incidents, relevance=relevance)

    @classmethod
    def facets(cls, filters: IncidentFilters) -> IncidentFacets:
        total = cls.apply(Incident.objects.all(), filters).count()

        countries = cls._value_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.COUNTRIES})),
            "cave__location__country_text",
            filters.countries,
            MAX_COUNTRY_FACETS,
        )
        states = cls._value_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.STATES})),
            "cave__location__state_text",
            filters.states,
            MAX_STATE_FACETS,
        )
        tags = cls._tag_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.TAGS})),
            filters.tags,
        )

        regions = cls._value_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.REGIONS})),
            "cave__location__region_text",
            filters.regions,
            MAX_REGION_FACETS,
        )
        injuries = cls._injury_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.INJURIES})),
            filters.injuries,
        )
        caves = cls._entity_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.CAVES})),
            "cave_id",
            "cave__name",
            filters.caves,
        )
        publications = cls._entity_facets(
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.PUBLICATIONS})),
            "origin_id",
            "origin__title",
            filters.publications,
        )

        year_counts = (
            cls._apply(Incident.objects.all(), filters, frozenset({Dimension.YEARS}))
            .filter(date_year__isnull=False)
            .order_by()
            .values_list("date_year")
            .annotate(count=Count("pk"))
        )
        decade_counts: Counter[int] = Counter()
        years: list[int] = []
        for year, count in year_counts:
            decade_counts[year // 10 * 10] += count
            years.append(year)

        return IncidentFacets(
            total=total,
            countries=countries,
            states=states,
            tags=tags,
            regions=regions,
            injuries=injuries,
            caves=caves,
            publications=publications,
            decades=[DecadeFacet(decade=d, count=decade_counts[d]) for d in sorted(decade_counts)],
            year_min=min(years, default=None),
            year_max=max(years, default=None),
        )

    @classmethod
    def aggregate(cls, filters: IncidentFilters, group_by: GroupBy) -> list[StatRow]:
        queryset = cls.apply(Incident.objects.all(), filters).order_by()
        incident_ids = queryset.values("pk")
        match group_by:
            case GroupBy.YEAR | GroupBy.DECADE:
                counts: Counter[int] = Counter()
                for year, count in (
                    queryset.filter(date_year__isnull=False)
                    .values_list("date_year")
                    .annotate(count=Count("pk"))
                ):
                    counts[year if group_by == GroupBy.YEAR else year // 10 * 10] += count
                return [StatRow(label=str(k), count=counts[k]) for k in sorted(counts)]
            case GroupBy.TAG:
                grouped = (
                    Incident.tags.through.objects.filter(incident__in=incident_ids)
                    .order_by()
                    .values_list("tag__name")
                    .annotate(count=Count("pk"))
                )
                return cls._top_rows(grouped, "tag__name")
            case GroupBy.STATE:
                return cls._top_rows(
                    queryset.exclude(cave__location__state_text="")
                    .values_list("cave__location__state_text")
                    .annotate(count=Count("pk")),
                    "cave__location__state_text",
                )
            case GroupBy.COUNTRY:
                return cls._top_rows(
                    queryset.exclude(cave__location__country_text="")
                    .values_list("cave__location__country_text")
                    .annotate(count=Count("pk")),
                    "cave__location__country_text",
                )
            case GroupBy.INJURY:
                return cls._top_rows(
                    IncidentPerson.injuries.through.objects.filter(
                        incidentperson__incident__in=incident_ids
                    )
                    .order_by()
                    .values_list("injury__description")
                    .annotate(count=Count("pk")),
                    "injury__description",
                )
            case GroupBy.AGE_BUCKET:
                return cls._age_rows(queryset)

    @classmethod
    def _age_rows(cls, queryset: QuerySet[Incident]) -> list[StatRow]:
        ages = (
            IncidentPerson.objects.filter(
                incident__in=queryset.values("pk"), age_at_incident__isnull=False
            )
            .order_by()
            .values_list("age_at_incident")
            .annotate(count=Count("pk"))
        )
        totals: Counter[str] = Counter()
        for age, count in ages:
            label = next((name for low, high, name in AGE_BUCKETS if low <= age <= high), None)
            totals[label or AGE_BUCKET_OVER] += count
        order = [name for _, _, name in AGE_BUCKETS] + [AGE_BUCKET_OVER]
        return [StatRow(label=name, count=totals[name]) for name in order if totals[name]]

    @staticmethod
    def _top_rows(grouped: QuerySet[Model, tuple[str, int]], field: str) -> list[StatRow]:
        return [
            StatRow(label=label, count=count)
            for label, count in grouped.order_by("-count", field)[:MAX_STAT_ROWS]
        ]

    @classmethod
    def _apply(
        cls,
        queryset: QuerySet[Incident],
        filters: IncidentFilters,
        skip: frozenset[Dimension],
    ) -> QuerySet[Incident]:
        if filters.q:
            queryset = queryset.filter(
                Q(search_vector=cls._search_query(filters.q))
                | Q(cave__name__icontains=filters.q)
                | Q(
                    Exists(
                        Incident.tags.through.objects.filter(
                            incident=OuterRef("pk"), tag__name__icontains=filters.q
                        )
                    )
                )
            )
        if filters.countries and Dimension.COUNTRIES not in skip:
            queryset = queryset.filter(cave__location__country_text__in=filters.countries)
        if filters.states and Dimension.STATES not in skip:
            queryset = queryset.filter(cave__location__state_text__in=filters.states)
        if filters.tags and Dimension.TAGS not in skip:
            queryset = queryset.filter(
                Exists(
                    Incident.tags.through.objects.filter(
                        incident=OuterRef("pk"), tag__name__in=filters.tags
                    )
                )
            )
        if filters.regions and Dimension.REGIONS not in skip:
            queryset = queryset.filter(cave__location__region_text__in=filters.regions)
        if filters.caves and Dimension.CAVES not in skip:
            queryset = queryset.filter(cave_id__in=filters.caves)
        if filters.publications and Dimension.PUBLICATIONS not in skip:
            queryset = queryset.filter(origin_id__in=filters.publications)
        if filters.injuries and Dimension.INJURIES not in skip:
            queryset = queryset.filter(
                Exists(
                    IncidentPerson.objects.filter(
                        incident=OuterRef("pk"), injuries__description__in=filters.injuries
                    )
                )
            )
        if filters.has_location is not None:
            located = Q(
                cave__location__latitude__isnull=False, cave__location__longitude__isnull=False
            )
            queryset = queryset.filter(located if filters.has_location else ~located)
        if Dimension.YEARS not in skip:
            if filters.year_from is not None:
                queryset = queryset.filter(date_year__gte=filters.year_from)
            if filters.year_to is not None:
                queryset = queryset.filter(date_year__lte=filters.year_to)
        return queryset

    @staticmethod
    def _relevance_of(incident: Incident) -> float:
        return float(vars(incident)["relevance"])

    @classmethod
    def _search_query(cls, q: str) -> PgSearchQuery:
        return PgSearchQuery(q, search_type="websearch")

    @classmethod
    def _rank(cls, queryset: QuerySet[Incident], q: str) -> QuerySet[Incident]:
        return queryset.annotate(
            rank=SearchRank(F("search_vector"), cls._search_query(q)),
            popularity_boost=Ln(F("view_count") + 2),
            relevance=F("rank") + F("popularity_boost") * 0.1,
        )

    @classmethod
    def _value_facets(
        cls,
        queryset: QuerySet[Incident],
        field: str,
        selected: list[str],
        cap: int,
    ) -> list[FacetValue]:
        grouped = (
            queryset.exclude(**{field: ""})
            .order_by()
            .values_list(field)
            .annotate(count=Count("pk"))
        )
        return cls._capped_with_selected(grouped, field, selected, cap)

    @classmethod
    def _tag_facets(cls, queryset: QuerySet[Incident], selected: list[str]) -> list[FacetValue]:
        grouped = (
            Incident.tags.through.objects.filter(incident__in=queryset.order_by().values("pk"))
            .order_by()
            .values_list("tag__name")
            .annotate(count=Count("pk"))
        )
        return cls._capped_with_selected(grouped, "tag__name", selected, MAX_TAG_FACETS)

    @classmethod
    def _injury_facets(cls, queryset: QuerySet[Incident], selected: list[str]) -> list[FacetValue]:
        grouped = (
            IncidentPerson.objects.filter(incident__in=queryset.order_by().values("pk"))
            .order_by()
            .values_list("injuries__description")
            .annotate(count=Count("incident", distinct=True))
            .filter(injuries__isnull=False)
        )
        return cls._capped_with_selected(
            grouped, "injuries__description", selected, MAX_INJURY_FACETS
        )

    @classmethod
    def _entity_facets(
        cls,
        queryset: QuerySet[Incident],
        id_field: str,
        name_field: str,
        selected: list[int],
    ) -> list[EntityFacet]:
        grouped = queryset.order_by().values_list(id_field, name_field).annotate(count=Count("pk"))
        facets = [
            EntityFacet(id=i, name=n, count=c)
            for i, n, c in grouped.order_by("-count", name_field)[:MAX_ENTITY_FACETS]
        ]
        present = {f.id for f in facets}
        missing = [v for v in dict.fromkeys(selected) if v not in present]
        if missing:
            found = {i: (n, c) for i, n, c in grouped.filter(**{f"{id_field}__in": missing})}
            names = dict(
                Incident.objects.filter(**{f"{id_field}__in": missing})
                .values_list(id_field, name_field)
                .distinct()
            )
            facets.extend(
                EntityFacet(
                    id=v,
                    name=found[v][0] if v in found else names.get(v, ""),
                    count=found[v][1] if v in found else 0,
                )
                for v in missing
            )
        return facets

    @classmethod
    def _capped_with_selected(
        cls,
        grouped: QuerySet[Model, tuple[str, int]],
        field: str,
        selected: list[str],
        cap: int,
    ) -> list[FacetValue]:
        facets = [
            FacetValue(value=value, count=count)
            for value, count in grouped.order_by("-count", field)[:cap]
        ]
        present = {f.value for f in facets}
        missing = [v for v in dict.fromkeys(selected) if v not in present]
        if missing:
            found = dict(grouped.filter(**{f"{field}__in": missing}))
            facets.extend(FacetValue(value=v, count=found.get(v, 0)) for v in missing)
        return facets
