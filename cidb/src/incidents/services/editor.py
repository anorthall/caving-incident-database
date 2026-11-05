from dataclasses import dataclass

from django.db import transaction

from cidb.src.core.imprecise_date import ImpreciseDate
from cidb.src.core.models.user import ACAUser
from cidb.src.incidents.models import Incident, IncidentRevision, Tag

MAX_TITLE_LENGTH = 100
MAX_TAG_LENGTH = 50


class IncidentEditError(ValueError):
    pass


@dataclass(frozen=True)
class IncidentEdit:
    title: str | None = None
    summary: str | None = None
    date: str | None = None
    tags: list[str] | None = None
    analysis: str | None = None


class IncidentEditor:
    def __init__(self, editor: ACAUser) -> None:
        self.editor = editor

    def update(
        self, incident_id: int, edit: IncidentEdit
    ) -> tuple[Incident, IncidentRevision | None]:
        with transaction.atomic():
            incident = Incident.objects.select_for_update().get(pk=incident_id)
            changes: dict[str, dict[str, str | list[str]]] = {}

            if edit.title is not None:
                title = edit.title.strip()
                if not title or len(title) > MAX_TITLE_LENGTH:
                    raise IncidentEditError(f"Title must be 1 to {MAX_TITLE_LENGTH} characters")
                self._record(changes, "title", incident.title, title)
                incident.title = title

            if edit.summary is not None:
                self._record(changes, "summary", incident.summary, edit.summary)
                incident.summary = edit.summary

            if edit.analysis is not None:
                self._record(changes, "analysis", incident.analysis, edit.analysis)
                incident.analysis = edit.analysis

            if edit.date is not None:
                try:
                    new_date = ImpreciseDate(edit.date.strip())
                except ValueError as exc:
                    raise IncidentEditError("Invalid date") from exc
                old_date = str(incident.date) if incident.date else ""
                self._record(changes, "date", old_date, str(new_date))
                incident.date = new_date

            tag_names: list[str] | None = None
            if edit.tags is not None:
                tag_names = sorted({name.strip() for name in edit.tags if name.strip()})
                if any(len(name) > MAX_TAG_LENGTH for name in tag_names):
                    raise IncidentEditError(f"Tags must be at most {MAX_TAG_LENGTH} characters")
                old_tags = sorted(incident.tags.values_list("name", flat=True))
                if old_tags != tag_names:
                    changes["tags"] = {"before": old_tags, "after": tag_names}

            if not changes:
                return incident, None

            incident.save()
            if tag_names is not None and "tags" in changes:
                incident.tags.set([Tag.objects.get_or_create(name=name)[0] for name in tag_names])
            revision = IncidentRevision.objects.create(
                incident=incident, editor=self.editor, changes=changes
            )
            return incident, revision

    @staticmethod
    def _record(
        changes: dict[str, dict[str, str | list[str]]], field: str, before: str, after: str
    ) -> None:
        if before != after:
            changes[field] = {"before": before, "after": after}
