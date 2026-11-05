import csv
import io
import json
from collections.abc import Iterable, Iterator
from enum import StrEnum

from cidb.src.incidents.exports.rows import IncidentExportRow


class ExportFormat(StrEnum):
    CSV = "csv"
    JSON = "json"


COLUMNS = list(IncidentExportRow.model_fields)


def stream_csv(rows: Iterable[IncidentExportRow]) -> Iterator[str]:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow(row.model_dump())
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate()
    yield buffer.getvalue()


def stream_json(rows: Iterable[IncidentExportRow]) -> Iterator[str]:
    yield "["
    for index, row in enumerate(rows):
        yield ("," if index else "") + json.dumps(row.model_dump(), ensure_ascii=False)
    yield "]"


def stream_export(rows: Iterable[IncidentExportRow], export_format: ExportFormat) -> Iterator[str]:
    if export_format == ExportFormat.CSV:
        return stream_csv(rows)
    return stream_json(rows)
