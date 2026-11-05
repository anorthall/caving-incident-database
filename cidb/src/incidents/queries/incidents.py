from collections import Counter
from dataclasses import dataclass
from enum import StrEnum

from django.contrib.postgres.search import SearchQuery as PgSearchQuery
from django.contrib.postgres.search import SearchRank
from django.db.models import Count, Exists, F, Model, OuterRef, Q, QuerySet
from django.db.models.functions import Ln

from cidb.src.incidents.models import Incident
from cidb.src.incidents.queries.filters import IncidentFilters

MAX_COUNTRY_FACETS = 20
MAX_STATE_FACETS = 60
MAX_TAG_FACETS = 40
MAX_MAP_POINTS = 5000


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
    YEARS = "years"


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
class DecadeFacet:
    decade: int
    count: int


@dataclass(frozen=True)
class IncidentFacets:
    total: int
    countries: list[FacetValue]
    states: list[FacetValue]
    tags: list[FacetValue]
    decades: list[DecadeFacet]
    year_min: int | None
    year_max: int | None


@dataclass(frozen=True)
class MapPoint:
    id: int
    title: str
    latitude: float
    longitude: float
    year: int | None


@dataclass(frozen=True)
class MapPoints:
    points: list[MapPoint]
    total: int
    without_location: int


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
    def points(cls, filters: IncidentFilters) -> MapPoints:
        queryset = cls.apply(Incident.objects.all(), filters)
        located = queryset.filter(
            cave__location__latitude__isnull=False, cave__location__longitude__isnull=False
        )
        rows = located.order_by("-date", "id").values_list(
            "id", "title", "cave__location__latitude", "cave__location__longitude", "date_year"
        )[:MAX_MAP_POINTS]
        points = [
            MapPoint(id=pk, title=title, latitude=float(lat), longitude=float(lng), year=year)
            for pk, title, lat, lng, year in rows
            if lat is not None and lng is not None
        ]
        total = located.count()
        return MapPoints(
            points=points,
            total=total,
            without_location=queryset.count() - total,
        )

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
            decades=[DecadeFacet(decade=d, count=decade_counts[d]) for d in sorted(decade_counts)],
            year_min=min(years, default=None),
            year_max=max(years, default=None),
        )

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
