import json
from pathlib import Path

from django.contrib.gis.geos import Point
from django.db import migrations
from django.utils.text import slugify

DATA = Path(__file__).resolve().parent.parent / "data" / "kenya.json"


def seed(apps, schema_editor):
    County = apps.get_model("locations", "County")
    Area = apps.get_model("locations", "Area")
    for c in json.loads(DATA.read_text(encoding="utf-8"))["counties"]:
        county, _ = County.objects.get_or_create(
            code=c["code"], defaults={"name": c["name"], "slug": slugify(c["name"])}
        )
        for a in c["areas"]:
            Area.objects.get_or_create(
                county=county,
                slug=slugify(a["name"]),
                defaults={"name": a["name"], "location": Point(a["lng"], a["lat"], srid=4326)},
            )


class Migration(migrations.Migration):
    dependencies = [("locations", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
