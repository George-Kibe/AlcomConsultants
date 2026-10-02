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
from apps.core.demo import DEMO_EMAIL
from apps.listings.models import Amenity, Property, PropertyMedia, PropertyType, Status
from apps.locations.models import Area

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
    (
        "Renting in Nairobi: a checklist for tenants",
        f"{SITE}/hero/07-living-room-evening",
        "A furnished living room in the evening light",
        "<p>Finding a good rental is easier with a short checklist. Take it with you to every "
        "viewing.</p><h2>Before you view</h2><ul><li>Set a budget: rent plus service charge, "
        "water and parking.</li><li>Check the commute at rush hour.</li></ul><h2>At the "
        "viewing</h2><ul><li>Run the taps and flush the toilets.</li><li>Ask how often water "
        "is rationed and whether there is a borehole or storage tank.</li><li>Look for damp "
        "on ceilings and around windows.</li></ul><h2>Before you sign</h2><p>Read the tenancy "
        "agreement, agree an <strong>inventory</strong> with photos, and get a receipt for the "
        "deposit.</p><p><em>This is demonstration content.</em></p>",
    ),
    (
        "Off-plan apartments: rewards and risks",
        f"{SITE}/hero/06-nairobi-skyline",
        "Apartment towers on the Nairobi skyline",
        "<p>Buying off-plan can save 15 to 25 percent on the finished price, but you carry the "
        "risk of delays.</p><h2>Check the developer</h2><p>Visit completed projects, confirm "
        "approvals from the county and NEMA, and ask who the contractor is.</p><h2>Protect "
        "your payments</h2><ol><li>Pay into an escrow or the project account, never "
        "cash.</li><li>Tie instalments to construction milestones.</li><li>Have an advocate "
        "review the sale agreement.</li></ol><blockquote><p>A fair price today is only a "
        "bargain if the building is finished.</p></blockquote><p><em>This is demonstration "
        "content.</em></p>",
    ),
]

# title, deal, type, area, price, unit, beds, baths, built m², photos, featured, amenities,
# and optionally a dict of other fields (furnishing, parking_spaces, status, …). Listings
# without photos stay drafts, ready for trying photo uploads in the dashboard.
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
        {"furnishing": "unfurnished", "parking_spaces": 4},
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
        ["gym", "lift", "backup-generator", "borehole", "247-security"],
        {"furnishing": "semi", "parking_spaces": 2},
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
        ["swimming-pool", "rooftop-terrace", "air-conditioning", "247-security"],
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
        ["lift", "swimming-pool", "gym", "247-security"],
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
        {"furnishing": "furnished", "parking_spaces": 1},
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
        ["247-security", "water-storage-tank"],
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
        {"furnishing": "furnished", "parking_spaces": 2},
    ),
    (
        "2 Bedroom Furnished Apartment",
        "rent",
        "apartment",
        "lavington",
        120_000,
        "per_month",
        2,
        2,
        95,
        "apartment",
        False,
        ["lift", "balcony", "fitted-kitchen", "247-security"],
        {"furnishing": "furnished", "parking_spaces": 1},
    ),
    (
        "Penthouse with Rooftop Terrace",
        "sale",
        "penthouse",
        "westlands",
        None,
        "total",
        4,
        4,
        320,
        "tower",
        False,
        ["rooftop-terrace", "lift", "swimming-pool", "gym", "en-suite-bedrooms"],
        {"furnishing": "furnished", "parking_spaces": 3, "price_on_request": True},
    ),
    (
        "Bedsitter near Thika Road",
        "rent",
        "bedsitter",
        "roysambu",
        12_000,
        "per_month",
        0,
        1,
        20,
        "tower",
        False,
        ["water-storage-tank"],
        {"furnishing": "unfurnished"},
    ),
    (
        "3 Bedroom Townhouse in Ongata Rongai",
        "sale",
        "townhouse",
        "ongata-rongai",
        11_500_000,
        "total",
        3,
        3,
        180,
        "townhouse",
        False,
        ["gated-community", "borehole", "childrens-play-area"],
        {"furnishing": "unfurnished", "parking_spaces": 2},
    ),
    (
        "5 Bedroom House with Pet-friendly Garden",
        "rent",
        "house",
        "muthaiga",
        750_000,
        "per_month",
        5,
        6,
        600,
        "villa",
        False,
        ["garden", "pet-friendly", "staff-quarters-dsq", "swimming-pool", "cctv"],
        {"furnishing": "furnished", "parking_spaces": 6},
    ),
    (
        "4 Bedroom Maisonette in Milimani",
        "sale",
        "maisonette",
        "kisumu-city",
        22_000_000,
        "total",
        4,
        4,
        260,
        "townhouse",
        False,
        ["garden", "solar-water-heating", "walk-in-closet"],
        {"furnishing": "semi", "parking_spaces": 2, "status": "under_offer"},
    ),
    (
        "2 Bedroom Apartment in Nakuru",
        "rent",
        "apartment",
        "nakuru-town",
        45_000,
        "per_month",
        2,
        2,
        90,
        "apartment",
        False,
        ["backup-generator", "visitor-parking"],
        {"furnishing": "semi", "parking_spaces": 1},
    ),
    (
        "3 Bedroom Bungalow in Nyeri",
        "rent",
        "bungalow",
        "nyeri-town",
        60_000,
        "per_month",
        3,
        2,
        150,
        "bungalow",
        False,
        ["garden", "borehole"],
        {"furnishing": "unfurnished", "status": "let"},
    ),
    (
        "Shop on a Busy High Street",
        "lease",
        "shop-retail",
        "nairobi-cbd",
        250_000,
        "per_month",
        None,
        1,
        80,
        "office",
        False,
        ["cctv", "backup-generator"],
    ),
    (
        "Warehouse with Loading Bays",
        "lease",
        "warehouse",
        "mlolongo",
        450,
        "per_sqm",
        None,
        2,
        1500,
        "office",
        False,
        ["cctv", "electric-fence", "backup-generator"],
    ),
    (
        "10-acre Farm near the Lake",
        "sale",
        "agricultural-land",
        "naivasha",
        2_500_000,
        "per_acre",
        None,
        None,
        None,
        "land",
        False,
        ["borehole"],
        {"land_area": Decimal(10)},
    ),
    (
        "Commercial Plot on Mombasa Road",
        "sale",
        "commercial-land",
        "athi-river",
        40_000_000,
        "total",
        None,
        None,
        None,
        "land",
        False,
        [],
        {"land_area": Decimal(1)},
    ),
    (
        "3 Bedroom Apartment in Kileleshwa",
        "sale",
        "apartment",
        "kileleshwa",
        19_500_000,
        "total",
        3,
        3,
        150,
        None,
        False,
        ["lift", "gym", "borehole"],
        {"furnishing": "unfurnished", "parking_spaces": 2},
    ),
    (
        "Office Suite in Gigiri",
        "lease",
        "office",
        "gigiri",
        2_000,
        "per_sqm",
        None,
        2,
        180,
        None,
        False,
        ["lift", "fibre-internet-ready", "visitor-parking"],
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
            ) = row[:12]
            extra: dict[str, Any] = {
                "land_area": Decimal("0.5") if ptype.endswith("land") else None,
                "status": Status.PUBLISHED if photos else Status.DRAFT,
                **(row[12] if len(row) > 12 else {}),
            }
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
                area=area,
                is_featured=featured,
                location=Point(base.x + 0.004 * (i % 3 - 1), base.y + 0.003 * (i % 2), srid=4326)
                if base
                else None,
                created_by=demo_user,
                updated_by=demo_user,
                **extra,
            )
            found = Amenity.objects.filter(slug__in=amenities)
            if missing := set(amenities) - {a.slug for a in found}:
                raise CommandError(f"Unknown amenities for {title!r}: {sorted(missing)}")
            prop.amenities.set(found)
            for order, public_id in enumerate(PHOTOS[photos] if photos else []):
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
                f"Created {len(LISTINGS)} demo listings (drafts without photos: "
                f"{sum(1 for row in LISTINGS if not row[9])}) and {len(POSTS)} demo articles."
            )
        )
