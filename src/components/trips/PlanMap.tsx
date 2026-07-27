import { MapContainer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import { StyledTileLayers } from "@/components/map/StyledTileLayers";
import { endIcon, startIcon } from "@/components/map/icons";
import { useMapStyle } from "@/lib/map/tiles";

function Fit({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);
  return null;
}

export interface PlanMapProps {
  path: Array<[number, number]>;
  origin: [number, number] | null;
  destination: [number, number] | null;
  current?: [number, number] | null;
}

export default function PlanMap({ path, origin, destination }: PlanMapProps) {
  const [mapStyle] = useMapStyle();
  const bounds = [...path];
  if (origin) bounds.push(origin);
  if (destination) bounds.push(destination);
  const center = origin ?? path[0] ?? ([-23.5505, -46.6333] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%", background: "#0b1220" }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <StyledTileLayers style={mapStyle} />
      {path.length > 1 && (
        <Polyline positions={path} pathOptions={{ color: "#22d3ee", weight: 5, opacity: 0.9 }} />
      )}
      {origin && <Marker position={origin} icon={startIcon} />}
      {destination && <Marker position={destination} icon={endIcon} />}
      <Fit points={bounds} />
    </MapContainer>
  );
}
