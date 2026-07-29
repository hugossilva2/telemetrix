import { Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

export type TelemetrySample = {
  lat: number;
  lng: number;
  speed?: number | null;
  /** km/h por segundo (positivo = acelerando, negativo = freando) */
  accel?: number | null;
  t?: number;
};

const NORMAL = "#22c55e";
const MODERATE = "#eab308";
const HARSH = "#ef4444";

/** Cor do segmento pela intensidade de aceleração/frenagem. */
export function colorForAccel(accel: number | null | undefined, speed?: number | null): string {
  if (typeof accel !== "number" || !Number.isFinite(accel)) {
    // Sem aceleração conhecida: parado = cinza, senão normal.
    if (typeof speed === "number" && speed < 1) return "#64748b";
    return NORMAL;
  }
  const a = Math.abs(accel);
  if (a >= 8) return HARSH;
  if (a >= 4) return MODERATE;
  return NORMAL;
}

/** Deriva a aceleração quando ela não vem pronta nos pontos. */
export function fillAccel(points: TelemetrySample[]): TelemetrySample[] {
  return points.map((p, i) => {
    if (typeof p.accel === "number") return p;
    const prev = points[i - 1];
    if (
      !prev ||
      typeof p.speed !== "number" ||
      typeof prev.speed !== "number" ||
      typeof p.t !== "number" ||
      typeof prev.t !== "number"
    ) {
      return { ...p, accel: null };
    }
    const dt = (p.t - prev.t) / 1000;
    if (!Number.isFinite(dt) || dt <= 0 || dt > 60) return { ...p, accel: null };
    return { ...p, accel: (p.speed - prev.speed) / dt };
  });
}

/**
 * Traçado real percorrido, colorido por telemetria:
 * verde = normal, amarelo = aceleração/frenagem moderada, vermelho = agressiva.
 */
export function TelemetryPolyline({
  points,
  weight = 5,
}: {
  points: TelemetrySample[];
  weight?: number;
}) {
  if (points.length < 2) return null;
  const filled = fillAccel(points);

  return (
    <>
      {/* Halo para dar leitura sobre o mapa escuro */}
      <Polyline
        positions={filled.map((p) => [p.lat, p.lng] as LatLngExpression)}
        pathOptions={{ color: "#0b1220", weight: weight + 4, opacity: 0.55, lineCap: "round" }}
      />
      {filled.slice(0, -1).map((p, i) => {
        const next = filled[i + 1];
        return (
          <Polyline
            key={i}
            positions={[
              [p.lat, p.lng],
              [next.lat, next.lng],
            ]}
            pathOptions={{
              color: colorForAccel(next.accel, next.speed),
              weight,
              opacity: 0.95,
              lineCap: "round",
            }}
          />
        );
      })}
    </>
  );
}

export function TelemetryLegend() {
  const items = [
    { color: NORMAL, label: "Normal" },
    { color: MODERATE, label: "Moderada" },
    { color: HARSH, label: "Agressiva" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(11,18,32,0.85)",
        border: "1px solid rgba(148,163,184,0.25)",
        color: "#e2e8f0",
        fontSize: 11,
        fontWeight: 600,
        backdropFilter: "blur(6px)",
      }}
    >
      <span style={{ opacity: 0.7 }}>aceleração</span>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 10,
              height: 4,
              borderRadius: 2,
              background: it.color,
              display: "inline-block",
            }}
          />
          <span>{it.label}</span>
        </span>
      ))}
    </div>
  );
}
