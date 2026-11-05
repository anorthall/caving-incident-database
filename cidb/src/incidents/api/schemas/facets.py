from ninja import Schema


class FacetValueSchema(Schema):
    value: str
    count: int


class DecadeFacetSchema(Schema):
    decade: int
    count: int


class IncidentFacetsSchema(Schema):
    total: int
    countries: list[FacetValueSchema]
    states: list[FacetValueSchema]
    tags: list[FacetValueSchema]
    decades: list[DecadeFacetSchema]
    year_min: int | None
    year_max: int | None


class MapPointSchema(Schema):
    id: int
    title: str
    latitude: float
    longitude: float
    year: int | None


class IncidentGeoSchema(Schema):
    points: list[MapPointSchema]
    total: int
    without_location: int


class BrowseValueSchema(Schema):
    value: str
    count: int
    id: int | None = None
