from typing import Any

from django.core.management.base import BaseCommand, CommandError

from cidb.src.incidents.models import Location
from cidb.src.incidents.services.data_quality import merge_locations


class Command(BaseCommand):
    help = "Merge a source Location into a target Location"

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("source", type=int)
        parser.add_argument("target", type=int)
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            source = Location.objects.get(pk=options["source"])
            target = Location.objects.get(pk=options["target"])
        except Location.DoesNotExist as exc:
            raise CommandError("Location not found") from exc
        caves = source.caves.count()
        if not options["apply"]:
            self.stdout.write(f"Dry run: would move {caves} caves from {source} to {target}")
            return
        try:
            moved = merge_locations(source, target)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(f"Moved {moved} caves from {source} to {target}")
