import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const startIcon = L.divIcon({
  className: "trip-marker-start",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid #052e16;box-shadow:0 0 0 3px rgba(34,197,94,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const endIcon = L.divIcon({
  className: "trip-marker-end",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #450a0a;box-shadow:0 0 0 3px rgba(239,68,68,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export interface TripMapProps {
  start: [number, number] | null;
  end: [number, number] | null;
}

export default function TripMap({ start, end }: TripMapProps) {
  const points: [number, number][] = [];
  if (start) points.push(start);
  if (end) points.push(end);

  const center = points[0] ?? ([-23.5505, -46.6333] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%", background: "#0b1220" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {start && <Marker position={start} icon={startIcon} />}
      {end && <Marker position={end} icon={endIcon} />}
      <FitBounds points={points} />
    </MapContainer>
  );
}
