"""Realistic demo listings and blog articles for development, CI and demos (never for real
production data)."""

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.blog.models import Post, PostStatus
from apps.listings.models import Amenity, Property, PropertyMedia, PropertyType, Status
from apps.locations.models import Area

DEMO_EMAIL = "demo-data@alcom.invalid"
SITE = "alcom_images/site"
PHOTOS = {
    "villa": [
        f"{SITE}/sample-properties/karen-villa",
        f"{SITE}/hero/04-villa-pool",
        f"{SITE}/hero/09-modern-living-room",
    ],
    "apartment": [
        f"{SITE}/sample-properties/kilimani-apartment",
        f"{SITE}/hero/07-living-room-evening",
        f"{SITE}/hero/03-apartments-garden",
    ],
    "house": [
        f"{SITE}/sample-properties/nyali-house",
        f"{SITE}/hero/08-house-pool",
        f"{SITE}/hero/09-modern-living-room",
    ],
    "townhouse": [
        f"{SITE}/sample-properties/runda-townhouse",
        f"{SITE}/hero/02-modern-home-dusk",
        f"{SITE}/hero/07-living-room-evening",
    ],
    "tower": [
        f"{SITE}/sample-properties/westlands-apartment",
        f"{SITE}/hero/03-apartments-garden",
        f"{SITE}/hero/09-modern-living-room",
    ],
    "bungalow": [f"{SITE}/sample-properties/syokimau-bungalow", f"{SITE}/hero/02-modern-home-dusk"],
    "land": [f"{SITE}/hero/05-leafy-neighbourhood"],
    "office": [f"{SITE}/hero/10-nairobi-city", f"{SITE}/hero/06-nairobi-skyline"],
}

# title, cover photo, cover description, body (HTML)
POSTS: list[tuple[str, str, str, str]] = [
    (
        "What to check before buying land in Kenya",
        f"{SITE}/hero/05-leafy-neighbourhood",
        "Tree-lined residential plots in a quiet neighbourhood",
        "<p>Land is the most common first investment for Kenyan buyers, and the most common "
        "source of disputes. A few checks before you pay a deposit protect you from most of "
        "them.</p><h2>1. Run an official search</h2><p>Ask the seller for a copy of the title "
        "and run a search at the Ministry of Lands (or on Ardhisasa) to confirm the registered "
        "owner and any charges, cautions or restrictions.</p><h2>2. Visit the plot</h2><ul>"
        "<li>Confirm the beacons with a licensed surveyor.</li><li>Talk to neighbours about "
        "access roads and boundaries.</li><li>Check for water, power and drainage.</li></ul>"
        "<h2>3. Get a valuation</h2><p>An independent valuation tells you whether the asking "
        "price is fair and is required if a bank is financing the purchase.</p><blockquote>"
        "<p>This is demonstration content showing how articles appear on the website.</p>"
        "</blockquote>",
    ),
    (
        "A landlord's guide to stress-free rent collection",
        f"{SITE}/hero/03-apartments-garden",
        "Low-rise apartment blocks around a landscaped garden",
        "<p>Late rent is the most common headache for landlords. Clear agreements and simple "
        "routines prevent most arrears.</p><h2>Put it in writing</h2><p>A tenancy agreement "
        "should state the rent, the due date, the deposit, and what happens if payment is "
        "late.</p><h2>Make paying easy</h2><p>Use a dedicated M-Pesa paybill or bank account "
        "per property and send receipts automatically.</p><h2>Follow up early</h2><ol><li>A "
        "friendly reminder on the due date.</li><li>A formal notice after seven days.</li><li>"
        "Professional follow-up if arrears continue.</li></ol><p><em>This is demonstration "
        "content.</em></p>",
    ),
    (
        "Why a professional valuation matters",
        f"{SITE}/hero/10-nairobi-city",
        "Nairobi's skyline in the afternoon",
        "<p>A valuation by a Registered Valuer gives banks, buyers, sellers and insurers an "
        "independent opinion of what a property is worth.</p><h2>When you need one</h2><ul>"
        "<li>Mortgages and secured lending</li><li>Buying or selling</li><li>Insurance "
        "(reinstatement cost)</li><li>Probate and succession</li></ul><p>Reports follow the "
        "Valuers Act and International Valuation Standards.</p><p><em>This is demonstration "
        "content.</em></p>",
    ),
]

# title, deal, type, area, price, unit, beds, baths, built m², photos, featured, amenities
LISTINGS: list[tuple[Any, ...]] = [
    (
        "4 Bedroom Villa with Pool",
        "sale",
        "villa",
        "karen",
        85_000_000,
        "total",
        4,
        5,
        450,
        "villa",
        True,
        ["swimming-pool", "garden", "staff-quarters-dsq", "borehole", "cctv"],
    ),
    (
        "3 Bedroom Apartment with Gym",
        "rent",
        "apartment",
        "kilimani",
        180_000,
        "per_month",
        3,
        3,
        165,
        "apartment",
        True,
        ["gym", "lift", "backup-generator", "borehole", "24-7-security"],
    ),
    (
        "5 Bedroom Beach House",
        "sale",
        "house",
        "nyali",
        120_000_000,
        "total",
        5,
        6,
        520,
        "house",
        True,
        ["swimming-pool", "rooftop-terrace", "air-conditioning", "24-7-security"],
    ),
    (
        "4 Bedroom Townhouse in a Gated Estate",
        "rent",
        "townhouse",
        "runda",
        350_000,
        "per_month",
        4,
        4,
        380,
        "townhouse",
        True,
        ["gated-community", "garden", "staff-quarters-dsq"],
    ),
    (
        "2 Bedroom Apartment with City Views",
        "sale",
        "apartment",
        "westlands",
        14_500_000,
        "total",
        2,
        2,
        110,
        "tower",
        True,
        ["lift", "swimming-pool", "gym", "24-7-security"],
    ),
    (
        "3 Bedroom Bungalow near the Expressway",
        "sale",
        "bungalow",
        "syokimau",
        18_000_000,
        "total",
        3,
        2,
        190,
        "bungalow",
        True,
        ["garden", "borehole", "electric-fence"],
    ),
    (
        "1 Bedroom Apartment",
        "rent",
        "apartment",
        "kileleshwa",
        75_000,
        "per_month",
        1,
        1,
        60,
        "apartment",
        False,
        ["lift", "backup-generator"],
    ),
    (
        "Studio Apartment",
        "rent",
        "studio",
        "ruaka",
        28_000,
        "per_month",
        0,
        1,
        32,
        "tower",
        False,
        ["24-7-security", "water-storage-tank"],
    ),
    (
        "4 Bedroom Maisonette",
        "sale",
        "maisonette",
        "kitengela",
        16_500_000,
        "total",
        4,
        3,
        220,
        "townhouse",
        False,
        ["gated-community", "garden", "solar-water-heating"],
    ),
    (
        "Half-acre Residential Plot",
        "sale",
        "residential-land",
        "tigoni",
        9_000_000,
        "total",
        None,
        None,
        None,
        "land",
        False,
        [],
    ),
    (
        "Office Space on Upper Hill",
        "lease",
        "office",
        "upper-hill",
        1_800,
        "per_sqm",
        None,
        4,
        300,
        "office",
        False,
        ["lift", "backup-generator", "visitor-parking", "fibre-internet-ready"],
    ),
    (
        "3 Bedroom Apartment by the Beach",
        "rent",
        "apartment",
        "diani",
        150_000,
        "per_month",
        3,
        3,
        170,
        "house",
        False,
        ["swimming-pool", "air-conditioning", "garden"],
    ),
]


class Command(BaseCommand):
    help = "Create (or --clear) realistic demo listings that reuse the site's Cloudinary photos."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--clear", action="store_true", help="Remove demo listings only")
        parser.add_argument("--allow-production", action="store_true")

    @transaction.atomic
    def handle(self, *args: Any, clear: bool, allow_production: bool, **options: Any) -> None:
        if not settings.DEBUG and not allow_production:
            raise CommandError("Refusing to seed demo data outside DEBUG (use --allow-production).")
        demo_user, _ = User.objects.get_or_create(
            email=DEMO_EMAIL, defaults={"first_name": "Demo data", "is_active": False}
        )
        removed, _ = Property.objects.filter(created_by=demo_user).delete()
        removed += Post.objects.filter(created_by=demo_user).delete()[0]
        if clear:
            self.stdout.write(f"Removed {removed} demo objects.")
            return

        for i, row in enumerate(LISTINGS):
            (
                title,
                deal,
                ptype,
                area_slug,
                price,
                unit,
                beds,
                baths,
                built,
                photos,
                featured,
                amenities,
            ) = row
            area = Area.objects.get(slug=area_slug)
            base = area.location
            prop = Property.objects.create(
                title=title,
                deal_type=deal,
                property_type=PropertyType.objects.get(slug=ptype),
                description=(
                    f"{title} in {area.name}, {area.county.name}.\n\n"
                    "This is demonstration data showing how listings appear on the website."
                ),
                price=price,
                price_unit=unit,
                bedrooms=beds,
                bathrooms=baths,
                built_area_sqm=Decimal(built) if built else None,
                land_area=Decimal("0.5") if ptype.endswith("land") else None,
                area=area,
                status=Status.PUBLISHED,
                is_featured=featured,
                location=Point(base.x + 0.004 * (i % 3 - 1), base.y + 0.003 * (i % 2), srid=4326)
                if base
                else None,
                created_by=demo_user,
                updated_by=demo_user,
            )
            prop.amenities.set(Amenity.objects.filter(slug__in=amenities))
            for order, public_id in enumerate(PHOTOS[photos]):
                PropertyMedia.objects.create(
                    property=prop,
                    public_id=public_id,
                    order=order,
                    width=1600,
                    height=1067,
                    alt_text=f"{title} photo {order + 1}",
                )
        now = timezone.now()
        for i, (title, cover, alt, body) in enumerate(POSTS):
            Post.objects.create(
                title=title,
                body=body,
                cover_public_id=cover,
                cover_alt=alt,
                cover_width=1600,
                cover_height=1067,
                status=PostStatus.PUBLISHED,
                published_at=now - timedelta(days=3 * i + 1),
                created_by=demo_user,
                updated_by=demo_user,
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {len(LISTINGS)} demo listings and {len(POSTS)} demo articles."
            )
        )
