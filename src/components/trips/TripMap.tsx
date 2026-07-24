import { useEffect, useRef } from "react";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { MapStyleControl } from "@/components/map/MapStyleControl";
import { MapButtons, ScaleControl } from "@/components/map/MapControls";
import { SpeedPolyline, SpeedLegend, type SpeedSample } from "@/components/map/SpeedPolyline";
import { StyledTileLayers } from "@/components/map/StyledTileLayers";
import { endIcon, startIcon } from "@/components/map/icons";
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
}

export default function TripMap({ start, end, trail }: TripMapProps) {
  const [mapStyle, setMapStyle] = useMapStyle();
  const containerRef = useRef<HTMLDivElement>(null);

  const points: [number, number][] = [];
  if (start) points.push(start);
  if (end) points.push(end);

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
