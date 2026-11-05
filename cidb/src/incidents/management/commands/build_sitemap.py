from pathlib import Path
from xml.etree import ElementTree as ET

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser

from cidb.src.incidents.models import Incident

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


class Command(BaseCommand):
    help = "Write sitemap.xml listing the landing page and all incidents"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--output", default=None)
        parser.add_argument("--site-url", default=None)

    def handle(self, *args: object, **options: str | None) -> None:
        output = Path(options["output"] or settings.SITEMAP_PATH)
        site_url = (options["site_url"] or settings.SITE_URL).rstrip("/")

        urlset = ET.Element("urlset", xmlns=SITEMAP_NS)
        landing = ET.SubElement(urlset, "url")
        ET.SubElement(landing, "loc").text = f"{site_url}/"

        count = 0
        for pk, updated_at in Incident.objects.order_by("pk").values_list("pk", "updated_at"):
            url = ET.SubElement(urlset, "url")
            ET.SubElement(url, "loc").text = f"{site_url}/incidents/{pk}"
            ET.SubElement(url, "lastmod").text = updated_at.date().isoformat()
            count += 1

        output.parent.mkdir(parents=True, exist_ok=True)
        ET.ElementTree(urlset).write(output, encoding="utf-8", xml_declaration=True)
        self.stdout.write(f"Wrote {count + 1} URLs to {output}")
