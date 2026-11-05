from ninja import Field, FilterSchema

MAX_FILTER_VALUES = 20


class IncidentFilters(FilterSchema):
    q: str | None = Field(None, description="Search query")
    tags: list[str] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    countries: list[str] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    states: list[str] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    year_from: int | None = Field(None, ge=1, le=9999)
    year_to: int | None = Field(None, ge=1, le=9999)
    caves: list[int] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    regions: list[str] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    injuries: list[str] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    publications: list[int] = Field(default_factory=list, max_length=MAX_FILTER_VALUES)
    has_location: bool | None = None
