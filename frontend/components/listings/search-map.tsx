"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { formatListingPrice } from "@/lib/format";
import {
  apiQuery,
  searchHref,
  type MapPoint,
  type SearchState,
} from "@/lib/listings";

const KENYA_CENTER: L.LatLngTuple = [-1.29, 36.82];

function compactPrice(p: MapPoint) {
  if (p.price_on_request || p.price == null) return "POA";
  const n = p.price;
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : `${Math.round(n / 1000)}K`;
}

function priceIcon(p: MapPoint) {
  return L.divIcon({
    className: "",
    html: `<span class="map-price-pin">${compactPrice(p)}</span>`,
    iconSize: undefined,
    iconAnchor: [24, 14],
  });
}

const CLUSTER_CELL_PX = 60;

/** True while the map moves itself (fit to results), so we don't offer "Search this area". */
let fitting = false;

function clusterIcon(count: number) {
  return L.divIcon({
    className: "",
    html: `<span class="map-cluster-pin">${count}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

/** Groups markers that would overlap at the current zoom; click a group to zoom in. */
function ClusteredMarkers({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => {
    const cells = new Map<string, MapPoint[]>();
    for (const p of points) {
      const pt = map.project([p.lat!, p.lng!], zoom);
      const key = `${Math.floor(pt.x / CLUSTER_CELL_PX)}:${Math.floor(pt.y / CLUSTER_CELL_PX)}`;
      cells.set(key, [...(cells.get(key) ?? []), p]);
    }
    return [...cells.values()];
  }, [points, zoom, map]);

  return groups.map((group) => {
    if (group.length === 1) {
      const p = group[0];
      return (
        <Marker
          key={p.slug}
          position={[p.lat!, p.lng!]}
          icon={priceIcon(p)}
          title={p.title}
        >
          <Popup minWidth={220}>
            <Link
              href={`/properties/${p.slug}`}
              className="flex flex-col gap-2 !text-inherit no-underline"
            >
              {p.cover_image && (
                <CloudImage
                  src={p.cover_image}
                  alt=""
                  width={220}
                  height={140}
                  crop="fill"
                  className="h-28 w-full rounded-md object-cover"
                />
              )}
              <span className="font-semibold">{p.title}</span>
              <span className="font-bold">
                {formatListingPrice(p.price, p.price_unit, p.price_on_request)}
              </span>
            </Link>
          </Popup>
        </Marker>
      );
    }
    const bounds = L.latLngBounds(group.map((p) => [p.lat!, p.lng!]));
    const sameSpot = bounds.getNorthEast().equals(bounds.getSouthWest());
    return (
      <Marker
        key={group.map((p) => p.slug).join("|")}
        position={bounds.getCenter()}
        icon={clusterIcon(group.length)}
        title={`${group.length} properties`}
        eventHandlers={
          sameSpot
            ? undefined
            : {
                click: () =>
                  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 }),
              }
        }
      >
        {sameSpot && (
          <Popup>
            <ul className="flex flex-col gap-1">
              {group.map((p) => (
                <li key={p.slug}>
                  <Link href={`/properties/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </Popup>
        )}
      </Marker>
    );
  });
}

function FitBounds({ points, bbox }: { points: MapPoint[]; bbox?: string }) {
  const map = useMap();
  useEffect(() => {
    fitting = true;
    map.once("moveend", () => {
      fitting = false;
    });
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number);
      map.fitBounds([
        [s, w],
        [n, e],
      ]);
    } else if (points.length) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat!, p.lng!])), {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [map, points, bbox]);
  return null;
}

function SearchThisArea({ state }: { state: SearchState }) {
  const router = useRouter();
  const [moved, setMoved] = useState(false);
  const map = useMapEvents({
    dragend: () => setMoved(true),
    zoomend: () => {
      if (!fitting) setMoved(true);
    },
  });
  if (!moved) return null;
  return (
    <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
      <Button
        size="lg"
        className="shadow-lg"
        onClick={() => {
          const b = map.getBounds();
          const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
            .map((v) => v.toFixed(4))
            .join(",");
          setMoved(false);
          router.push(searchHref(state, { bbox, page: undefined }), {
            scroll: false,
          });
        }}
      >
        Search this area
      </Button>
    </div>
  );
}

export default function SearchMap({ state }: { state: SearchState }) {
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const query = useMemo(
    () => new URLSearchParams(apiQuery(state)).toString(),
    [state],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/properties/map/?${query}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPoints)
      .catch(() => setPoints([]));
    return () => controller.abort();
  }, [query]);

  return (
    <div
      className="relative"
      role="region"
      aria-label="Map of matching properties"
    >
      <MapContainer
        center={KENYA_CENTER}
        zoom={11}
        scrollWheelZoom
        className="z-0 h-[65vh] min-h-[420px] w-full rounded-2xl border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points && <ClusteredMarkers points={points} />}
        {points && <FitBounds points={points} bbox={state.bbox} />}
        <SearchThisArea state={state} />
      </MapContainer>
      {points?.length === 0 && (
        <p className="bg-background/95 absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow">
          No properties with a map location match these filters.
        </p>
      )}
    </div>
  );
}
