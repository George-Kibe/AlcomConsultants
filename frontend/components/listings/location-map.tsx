"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";

const pin = L.divIcon({
  className: "",
  html: '<span class="map-price-pin">●</span>',
  iconAnchor: [10, 12],
});

export default function LocationMap({
  lat,
  lng,
  exact,
  label,
}: {
  lat: number;
  lng: number;
  exact: boolean;
  label: string;
}) {
  return (
    <div role="region" aria-label={`Map of ${label}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={exact ? 15 : 14}
        scrollWheelZoom={false}
        className="z-0 h-80 w-full rounded-2xl border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {exact ? (
          <Marker position={[lat, lng]} icon={pin} title={label} />
        ) : (
          <Circle
            center={[lat, lng]}
            radius={800}
            pathOptions={{ color: "#27225c", fillOpacity: 0.15 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
