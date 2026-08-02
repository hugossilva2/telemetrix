import { CircleMarker, MapContainer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
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

export interface PlanMapMarker {
  lat: number;
  lng: number;
  label: string;
}

export interface PlanMapProps {
  path: Array<[number, number]>;
  origin: [number, number] | null;
  destination: [number, number] | null;
  current?: [number, number] | null;
  /** Paradas de descanso sugeridas (modo viagem longa). */
  restStops?: PlanMapMarker[];
  /** Ponto onde a autonomia acaba (modo viagem longa). */
  refuel?: PlanMapMarker | null;
}

export default function PlanMap({
  path,
  origin,
  destination,
  restStops = [],
  refuel = null,
}: PlanMapProps) {
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
      {restStops.map((s, i) => (
        <CircleMarker
          key={`rest-${i}`}
          center={[s.lat, s.lng]}
          radius={7}
          pathOptions={{ color: "#22d3ee", fillColor: "#0b1220", fillOpacity: 1, weight: 3 }}
        >
          <Tooltip>{s.label}</Tooltip>
        </CircleMarker>
      ))}
      {refuel && (
        <CircleMarker
          center={[refuel.lat, refuel.lng]}
          radius={8}
          pathOptions={{ color: "#f87171", fillColor: "#f87171", fillOpacity: 0.85, weight: 3 }}
        >
          <Tooltip>{refuel.label}</Tooltip>
        </CircleMarker>
      )}
      {origin && <Marker position={origin} icon={startIcon} />}
      {destination && <Marker position={destination} icon={endIcon} />}
      <Fit points={bounds} />
    </MapContainer>
  );
}

