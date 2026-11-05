from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from cidb.src.core.models.user import ACAUser
from cidb.src.incidents.api.schemas.incident import IncidentDetailSchema
from cidb.src.incidents.api.schemas.revision import IncidentUpdateRequest, RevisionSchema
from cidb.src.incidents.models import Incident, IncidentRevision
from cidb.src.incidents.services.editor import IncidentEdit, IncidentEditError, IncidentEditor

router = Router()


@router.patch("/incidents/{incident_id}", response=IncidentDetailSchema)
def update_incident(
    request: HttpRequest, incident_id: int, payload: IncidentUpdateRequest
) -> IncidentDetailSchema:
    user = request.user
    if not isinstance(user, ACAUser):
        raise HttpError(401, "Unauthorized")
    get_object_or_404(Incident, pk=incident_id)
    try:
        IncidentEditor(user).update(incident_id, IncidentEdit(**payload.dict(exclude_unset=True)))
    except IncidentEditError as exc:
        raise HttpError(422, str(exc)) from exc
    incident = Incident.objects.select_related("cave__location", "origin").get(pk=incident_id)
    return IncidentDetailSchema.from_incident(incident)


@router.get("/incidents/{incident_id}/revisions", response=list[RevisionSchema])
def list_revisions(request: HttpRequest, incident_id: int) -> list[RevisionSchema]:
    get_object_or_404(Incident, pk=incident_id)
    revisions = IncidentRevision.objects.filter(incident_id=incident_id).select_related("editor")
    return [RevisionSchema.from_revision(r) for r in revisions]
