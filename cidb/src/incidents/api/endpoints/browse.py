from django.http import HttpRequest
from ninja import Router

from cidb.src.incidents.api.schemas.facets import BrowseValueSchema
from cidb.src.incidents.queries.browse import BrowseDimension, BrowseQuery

router = Router()


@router.get("/{dimension}", response=list[BrowseValueSchema])
def browse(request: HttpRequest, dimension: BrowseDimension) -> list[BrowseValueSchema]:
    return [
        BrowseValueSchema(value=v.value, count=v.count, id=v.id)
        for v in BrowseQuery.values(dimension)
    ]
