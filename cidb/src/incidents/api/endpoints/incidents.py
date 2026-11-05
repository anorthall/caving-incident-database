from typing import Annotated

from django.contrib.postgres.search import TrigramSimilarity
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema

from cidb.src.incidents.api.schemas.common import PaginatedResponse
from cidb.src.incidents.api.schemas.facets import (
    DecadeFacetSchema,
    FacetValueSchema,
    IncidentFacetsSchema,
    IncidentGeoSchema,
    MapPointSchema,
)
from cidb.src.incidents.api.schemas.incident import (
    IncidentDetailSchema,
    IncidentListSchema,
)
from cidb.src.incidents.models import (
    Incident,
    SearchClick,
    SearchQuery,
)
from cidb.src.incidents.queries.filters import IncidentFilters
from cidb.src.incidents.queries.incidents import IncidentQuery, SortBy

router = Router()


class SuggestionSchema(Schema):
    suggestions: list[str]


class DidYouMeanSchema(Schema):
    suggestion: str | None
    similarity: float | None


class ClickTrackRequest(Schema):
    query: str
    incident_id: int
    position: int


class ClickTrackSchema(Schema):
    success: bool


@router.get(
    "/search",
    response=PaginatedResponse[IncidentListSchema],
)
def search_incidents(
    request: HttpRequest,
    filters: Query[IncidentFilters],
    sort_by: Annotated[SortBy | None, Query(description="Sort field")] = None,
    sort_order: Annotated[str, Query(description="Sort order", pattern="^(asc|desc)$")] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[IncidentListSchema]:
    if filters.q and page == 1:
        SearchQuery.record_search(filters.q)

    result = IncidentQuery.list_page(filters, sort_by, sort_order, page, page_size)

    return PaginatedResponse(
        items=[
            IncidentListSchema.from_incident(i, relevance_score=result.relevance.get(i.pk))
            for i in result.incidents
        ],
        total=result.total,
        page=page,
        page_size=page_size,
        total_pages=(result.total + page_size - 1) // page_size if result.total > 0 else 0,
    )


@router.get("/facets", response=IncidentFacetsSchema)
def get_facets(request: HttpRequest, filters: Query[IncidentFilters]) -> IncidentFacetsSchema:
    facets = IncidentQuery.facets(filters)
    return IncidentFacetsSchema(
        total=facets.total,
        countries=[FacetValueSchema(value=f.value, count=f.count) for f in facets.countries],
        states=[FacetValueSchema(value=f.value, count=f.count) for f in facets.states],
        tags=[FacetValueSchema(value=f.value, count=f.count) for f in facets.tags],
        decades=[DecadeFacetSchema(decade=d.decade, count=d.count) for d in facets.decades],
        year_min=facets.year_min,
        year_max=facets.year_max,
    )


@router.get("/geo", response=IncidentGeoSchema)
def get_geo(request: HttpRequest, filters: Query[IncidentFilters]) -> IncidentGeoSchema:
    result = IncidentQuery.points(filters)
    return IncidentGeoSchema(
        points=[
            MapPointSchema(
                id=p.id, title=p.title, latitude=p.latitude, longitude=p.longitude, year=p.year
            )
            for p in result.points
        ],
        total=result.total,
        without_location=result.without_location,
    )


@router.get("/suggestions", response=SuggestionSchema)
def get_suggestions(
    request: HttpRequest,
    q: Annotated[str, Query(description="Partial search query", min_length=2)],
    limit: Annotated[int, Query(ge=1, le=20)] = 8,
) -> SuggestionSchema:
    normalized = q.lower().strip()

    suggestions = list(
        SearchQuery.objects.filter(query__istartswith=normalized)
        .order_by("-query_count")
        .values_list("query", flat=True)[:limit]
    )

    if len(suggestions) < limit:
        containing = list(
            SearchQuery.objects.filter(query__icontains=normalized)
            .exclude(query__istartswith=normalized)
            .order_by("-query_count")
            .values_list("query", flat=True)[: limit - len(suggestions)]
        )
        suggestions.extend(containing)

    return SuggestionSchema(suggestions=suggestions)


@router.get("/did-you-mean", response=DidYouMeanSchema)
def get_did_you_mean(
    request: HttpRequest,
    q: Annotated[str, Query(description="Search query to check", min_length=2)],
) -> DidYouMeanSchema:
    normalized = q.lower().strip()

    similar = (
        SearchQuery.objects.annotate(similarity=TrigramSimilarity("query", normalized))
        .filter(similarity__gt=0.3)
        .exclude(query=normalized)
        .order_by("-similarity", "-query_count")
        .values("query", "similarity")
        .first()
    )

    if similar:
        return DidYouMeanSchema(
            suggestion=similar["query"],
            similarity=round(similar["similarity"], 2),
        )

    return DidYouMeanSchema(suggestion=None, similarity=None)


@router.post("/click", response=ClickTrackSchema)
def track_click(request: HttpRequest, payload: ClickTrackRequest) -> ClickTrackSchema:
    if not Incident.objects.filter(pk=payload.incident_id).exists():
        return ClickTrackSchema(success=False)

    SearchClick.record_click(
        query=payload.query, incident_id=payload.incident_id, position=payload.position
    )
    return ClickTrackSchema(success=True)


@router.get("/{incident_id}", response=IncidentDetailSchema)
def get_incident(request: HttpRequest, incident_id: int) -> IncidentDetailSchema:
    Incident.increment_view_count(incident_id)
    incident = get_object_or_404(
        Incident.objects.select_related(
            "cave",
            "cave__location",
            "cave__location__canonical_area",
            "origin",
        ).prefetch_related(
            "tags",
            "references",
        ),
        pk=incident_id,
    )

    return IncidentDetailSchema.from_incident(incident)
