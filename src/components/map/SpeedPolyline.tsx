import { Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

export type SpeedSample = {
  lat: number;
  lng: number;
  speed?: number | null;
  t?: number;
};

export function colorForSpeed(kmh: number | null | undefined): string {
  const v = typeof kmh === "number" && Number.isFinite(kmh) ? kmh : 0;
  if (v < 20) return "#3b82f6";
  if (v < 40) return "#22c55e";
  if (v < 60) return "#eab308";
  if (v < 80) return "#f97316";
  return "#ef4444";
}

export function SpeedPolyline({ points }: { points: SpeedSample[] }) {
  if (points.length < 2) return null;
  const hasSpeed = points.some((p) => typeof p.speed === "number");
  const positions: LatLngExpression[] = points.map((p) => [p.lat, p.lng]);

  if (!hasSpeed) {
    return (
      <>
        <Polyline
          positions={positions}
          pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.85, lineCap: "round" }}
        />
        <Polyline
          positions={positions}
          pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.35, dashArray: "2 6" }}
        />
      </>
    );
  }

  return (
    <>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const seg: LatLngExpression[] = [
          [p.lat, p.lng],
          [next.lat, next.lng],
        ];
        return (
          <Polyline
            key={i}
            positions={seg}
            pathOptions={{
              color: colorForSpeed(p.speed),
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
            }}
          />
        );
      })}
    </>
  );
}
