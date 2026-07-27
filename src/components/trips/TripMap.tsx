import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { MapStyleControl } from "@/components/map/MapStyleControl";
import { MapButtons, ScaleControl } from "@/components/map/MapControls";
import { SpeedPolyline, SpeedLegend, type SpeedSample } from "@/components/map/SpeedPolyline";
import { StyledTileLayers } from "@/components/map/StyledTileLayers";
import { endIcon, makeEcoEventIcon, startIcon } from "@/components/map/icons";
import type { EcoEvent } from "@/lib/eco/detect";
import { ECO_EVENT_LABEL } from "@/lib/eco/score";
import { useMapStyle } from "@/lib/map/tiles";

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
  trail?: SpeedSample[];
  ecoEvents?: EcoEvent[];
}

export default function TripMap({ start, end, trail, ecoEvents }: TripMapProps) {
  const [mapStyle, setMapStyle] = useMapStyle();
  const containerRef = useRef<HTMLDivElement>(null);

  const events = (ecoEvents ?? []).filter(
    (e): e is EcoEvent & { lat: number; lng: number } =>
      typeof e.lat === "number" && typeof e.lng === "number",
  );

  const points: [number, number][] = [];
  if (start) points.push(start);
  if (end) points.push(end);
  for (const e of events) points.push([e.lat, e.lng]);

  const routePoints: SpeedSample[] =
    trail && trail.length > 1
      ? trail
      : start && end
        ? [
            { lat: start[0], lng: start[1] },
            { lat: end[0], lng: end[1] },
          ]
        : [];

  const center = points[0] ?? ([-23.5505, -46.6333] as [number, number]);

  return (
    <div ref={containerRef} style={{ position: "relative", height: "100%", width: "100%", background: "#0b1220" }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        scrollWheelZoom
      >
        <StyledTileLayers style={mapStyle} />
        <ScaleControl />
        {routePoints.length > 1 && <SpeedPolyline points={routePoints} />}
        {start && <Marker position={start} icon={startIcon} />}
        {end && <Marker position={end} icon={endIcon} />}
        {events.map((e, i) => (
          <Marker
            key={`${e.t}-${i}`}
            position={[e.lat, e.lng]}
            icon={makeEcoEventIcon(e.type, e.severity)}
          >
            <Popup>
              <strong>{ECO_EVENT_LABEL[e.type]}</strong>
              {e.severity === "severe" ? " (severo)" : ""}
              <br />
              {new Date(e.t).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {Math.round(e.speedBefore)}→{Math.round(e.speedAfter)} km/h
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>


      <MapStyleControl value={mapStyle} onChange={setMapStyle} />
      <MapButtons containerRef={containerRef} />
      {routePoints.length > 1 && trail && trail.some((p) => typeof p.speed === "number") && (
        <SpeedLegend />
      )}
    </div>
  );
}
