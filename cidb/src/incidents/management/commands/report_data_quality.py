from typing import Any

from django.core.management.base import BaseCommand

from cidb.src.incidents.services.data_quality import run_checks


class Command(BaseCommand):
    help = "Report data quality issues"

    def handle(self, *args: Any, **options: Any) -> None:
        for check in run_checks():
            self.stdout.write(f"{check.title}: {check.count}")
            for sample in check.samples:
                self.stdout.write(f"  {sample.kind} #{sample.id} {sample.label}")
