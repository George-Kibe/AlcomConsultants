from django.db import migrations
from django.utils.text import slugify

PROPERTY_TYPES = [
    ("residential", ["Apartment", "House", "Townhouse", "Maisonette", "Bungalow", "Villa",
                     "Penthouse", "Studio", "Bedsitter"]),
    ("commercial", ["Office", "Shop / Retail", "Warehouse", "Industrial", "Mixed-use"]),
    ("land", ["Residential Land", "Commercial Land", "Agricultural Land"]),
]

# (group, name, lucide icon)
AMENITIES = [
    ("Security", "24/7 Security", "shield-check"),
    ("Security", "CCTV", "cctv"),
    ("Security", "Electric Fence", "zap"),
    ("Security", "Gated Community", "door-closed"),
    ("Utilities", "Borehole", "droplets"),
    ("Utilities", "Water Storage Tank", "droplet"),
    ("Utilities", "Backup Generator", "plug-zap"),
    ("Utilities", "Solar Water Heating", "sun"),
    ("Utilities", "Fibre Internet Ready", "wifi"),
    ("Facilities", "Swimming Pool", "waves"),
    ("Facilities", "Gym", "dumbbell"),
    ("Facilities", "Lift", "arrow-up-down"),
    ("Facilities", "Children's Play Area", "baby"),
    ("Facilities", "Clubhouse", "building-2"),
    ("Facilities", "Rooftop Terrace", "sunset"),
    ("Facilities", "Visitor Parking", "car"),
    ("Home", "Garden", "trees"),
    ("Home", "Balcony", "panel-top"),
    ("Home", "Staff Quarters (DSQ)", "house"),
    ("Home", "Fitted Kitchen", "utensils"),
    ("Home", "En-suite Bedrooms", "bath"),
    ("Home", "Walk-in Closet", "shirt"),
    ("Home", "Air Conditioning", "air-vent"),
    ("Home", "Pet Friendly", "paw-print"),
    ("Home", "Wheelchair Accessible", "accessibility"),
]


def seed(apps, schema_editor):
    PropertyType = apps.get_model("listings", "PropertyType")
    Amenity = apps.get_model("listings", "Amenity")
    order = 0
    for category, names in PROPERTY_TYPES:
        for name in names:
            order += 10
            PropertyType.objects.get_or_create(
                slug=slugify(name), defaults={"name": name, "category": category, "order": order}
            )
    for group, name, icon in AMENITIES:
        Amenity.objects.get_or_create(
            slug=slugify(name), defaults={"name": name, "group": group, "icon": icon}
        )


class Migration(migrations.Migration):
    dependencies = [("listings", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
