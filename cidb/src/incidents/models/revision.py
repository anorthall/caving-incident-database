from django.conf import settings
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta

from cidb.src.incidents.models.incident import Incident


class IncidentRevision(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="revisions")
    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="incident_revisions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    changes = models.JSONField(default=dict)

    class Meta(TypedModelMeta):
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"Revision {self.pk} of incident {self.incident_id}"
