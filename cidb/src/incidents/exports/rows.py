from pydantic import BaseModel

from cidb.src.incidents.models import Incident


class IncidentExportRow(BaseModel):
    id: int
    title: str
    date: str
    year: int | None
    cave: str
    country: str
    state: str
    region: str
    latitude: float | None
    longitude: float | None
    tags: str
    summary: str
    url: str

    @classmethod
    def from_incident(cls, incident: Incident) -> IncidentExportRow:
        cave = incident.cave
        location = cave.location if cave else None
        date = incident.date
        return cls(
            id=incident.pk,
            title=incident.title,
            date=str(date) if date else "",
            year=date.year if date else None,
            cave=cave.name if cave else "",
            country=location.country_text if location else "",
            state=location.state_text if location else "",
            region=location.region_text if location else "",
            latitude=float(location.latitude) if location and location.latitude else None,
            longitude=float(location.longitude) if location and location.longitude else None,
            tags="; ".join(sorted(tag.name for tag in incident.tags.all())),
            summary=incident.summary,
            url=f"/incidents/{incident.pk}",
        )
