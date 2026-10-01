"""Places near a listing, from OpenStreetMap (Overpass API), cached per location."""

import json
import logging
import math
import urllib.parse
import urllib.request
from typing import Any

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Public Overpass servers are busy at times; try the main instance, then a mirror.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
RADIUS_M = 1500
PER_CATEGORY = 3
CACHE_SECONDS = 7 * 24 * 3600
FAILURE_CACHE_SECONDS = 600

# (category label, OSM tag, value regex)
CATEGORIES: list[tuple[str, str, str]] = [
    ("Schools", "amenity", "school|university|college|kindergarten"),
    ("Health", "amenity", "hospital|clinic|pharmacy"),
    ("Shopping", "shop", "mall|supermarket"),
    ("Transport", "railway", "station|halt"),
    ("Parks", "leisure", "park"),
]


def _query(lat: float, lng: float) -> str:
    around = f"(around:{RADIUS_M},{lat},{lng})"
    parts = [
        f'{kind}{around}["{tag}"~"^({values})$"]["name"];'
        for _, tag, values in CATEGORIES
        for kind in ("node", "way")
    ]
    return f"[out:json][timeout:15];({''.join(parts)});out center 80;"


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Great-circle distance in metres."""
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)))


def _fetch(lat: float, lng: float) -> dict[str, Any]:
    data = urllib.parse.urlencode({"data": _query(lat, lng)}).encode()
    error: Exception | None = None
    for url in OVERPASS_URLS:
        request = urllib.request.Request(  # noqa: S310 (fixed https URLs)
            url,
            data=data,
            headers={"User-Agent": "AlcomConsultants/1.0 (https://alcomconsultants.co.ke)"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
                result: dict[str, Any] = json.loads(response.read())
                return result
        except Exception as exc:
            logger.info("Overpass %s failed: %s", url, exc)
            error = exc
    raise error or RuntimeError("No Overpass server configured")


def group_places(elements: list[dict[str, Any]], lat: float, lng: float) -> list[dict[str, Any]]:
    """Nearest few named places per category."""
    groups: dict[str, list[dict[str, Any]]] = {label: [] for label, _, _ in CATEGORIES}
    seen: set[tuple[str, str]] = set()
    for el in elements:
        tags = el.get("tags", {})
        point = el.get("center") or el
        if "lat" not in point or not tags.get("name"):
            continue
        for label, tag, values in CATEGORIES:
            if tags.get(tag) in values.split("|"):
                key = (label, tags["name"].lower())
                if key in seen:
                    break
                seen.add(key)
                groups[label].append(
                    {
                        "name": tags["name"],
                        "type": tags[tag].replace("_", " "),
                        "distance_m": distance_m(lat, lng, point["lat"], point["lon"]),
                        "lat": point["lat"],
                        "lng": point["lon"],
                    }
                )
                break
    return [
        {"category": label, "places": sorted(places, key=lambda p: p["distance_m"])[:PER_CATEGORY]}
        for label, places in groups.items()
        if places
    ]


def nearby_places(lat: float, lng: float) -> list[dict[str, Any]]:
    key = f"nearby:{lat:.3f}:{lng:.3f}"
    cached = cache.get(key)
    if cached is not None:
        return list(cached)
    try:
        places = group_places(_fetch(lat, lng).get("elements", []), lat, lng)
    except Exception:
        logger.warning("Overpass lookup failed for %s,%s", lat, lng, exc_info=True)
        cache.set(key, [], FAILURE_CACHE_SECONDS)
        return []
    cache.set(key, places, CACHE_SECONDS)
    return places
