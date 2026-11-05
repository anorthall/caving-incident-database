from django.http import HttpRequest
from ninja import Router

from cidb.src.core.models.user import ACAUser
from cidb.src.incidents.api.endpoints.feedback import router as feedback_router
from cidb.src.incidents.api.endpoints.revisions import router as revisions_router
from cidb.src.incidents.api.schemas.data_quality import DataQualityCheck
from cidb.src.incidents.services.data_quality import run_checks


class EditorAuth:
    def __call__(self, request: HttpRequest) -> ACAUser | None:
        if not request.user.is_authenticated:
            return None
        user = request.user
        if user.is_editor or user.is_staff:
            return user
        return None


router = Router(auth=EditorAuth())
router.add_router("/feedback", feedback_router, tags=["feedback"])
router.add_router("", revisions_router, tags=["staff"])


@router.get("/data-quality", response=list[DataQualityCheck])
def data_quality(request: HttpRequest) -> list[DataQualityCheck]:
    return [DataQualityCheck.model_validate(c, from_attributes=True) for c in run_checks()]
