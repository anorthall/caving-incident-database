from datetime import datetime

from ninja import Schema

from cidb.src.incidents.models import IncidentRevision


class IncidentUpdateRequest(Schema):
    title: str | None = None
    summary: str | None = None
    date: str | None = None
    tags: list[str] | None = None
    analysis: str | None = None


class FieldChangeSchema(Schema):
    before: str | list[str]
    after: str | list[str]


class RevisionSchema(Schema):
    id: int
    editor_name: str | None
    created_at: datetime
    changes: dict[str, FieldChangeSchema]

    @staticmethod
    def from_revision(revision: IncidentRevision) -> RevisionSchema:
        editor = revision.editor
        return RevisionSchema(
            id=revision.id,
            editor_name=(editor.name or editor.email) if editor else None,
            created_at=revision.created_at,
            changes={k: FieldChangeSchema(**v) for k, v in revision.changes.items()},
        )


class PendingCountSchema(Schema):
    count: int
