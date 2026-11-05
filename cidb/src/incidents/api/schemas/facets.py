from ninja import Schema


class FacetValueSchema(Schema):
    value: str
    count: int


class EntityFacetSchema(Schema):
    id: int
    name: str
    count: int


class DecadeFacetSchema(Schema):
    decade: int
    count: int


class IncidentFacetsSchema(Schema):
    total: int
    countries: list[FacetValueSchema]
    states: list[FacetValueSchema]
    tags: list[FacetValueSchema]
    regions: list[FacetValueSchema]
    injuries: list[FacetValueSchema]
    caves: list[EntityFacetSchema]
    publications: list[EntityFacetSchema]
    decades: list[DecadeFacetSchema]
    year_min: int | None
    year_max: int | None
