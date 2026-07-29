import { useEffect } from "react";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { TelemetryPolyline } from "./TelemetryPolyline";
import { type SpeedSample } from "./SpeedPolyline";
import { StyledTileLayers } from "./StyledTileLayers";
import { makeCarIcon, startIcon } from "./icons";
import { useMapStyle } from "@/lib/map/tiles";

function AutoFit({ points, follow }: { points: [number, number][]; follow: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (follow) {
      map.setView(follow, Math.max(map.getZoom(), 15), { animate: true });
      return;
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [24, 24] });
  }, [map, points, follow]);
  return null;
}

export interface MiniTripMapProps {
  trail: SpeedSample[];
  start: [number, number] | null;
  current: [number, number] | null;
  moving?: boolean;
}

export default function MiniTripMap({ trail, start, current, moving = false }: MiniTripMapProps) {
  const [mapStyle] = useMapStyle();
  const carIcon = makeCarIcon({ moving, ignition: true });

  const bounds: [number, number][] = [];
  if (start) bounds.push(start);
  trail.forEach((p) => bounds.push([p.lat, p.lng]));
  if (current) bounds.push(current);

  const center = current ?? start ?? ([-23.5505, -46.6333] as [number, number]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", background: "#0b1220" }}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <StyledTileLayers style={mapStyle} />
        {trail.length > 1 && <TelemetryPolyline points={trail} weight={4} />}
        {start && <Marker position={start} icon={startIcon} />}
        {current && <Marker position={current} icon={carIcon} />}
        <AutoFit points={bounds} follow={moving ? current : null} />
      </MapContainer>
    </div>
  );
}
