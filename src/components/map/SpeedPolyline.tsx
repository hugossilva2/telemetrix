import { Polyline } from "react-leaflet";

export type SpeedSample = {
  lat: number;
  lng: number;
  speed?: number | null;
  t?: number;
};

/** Cor pela faixa de velocidade (km/h). */
export function colorForSpeed(kmh: number | null | undefined): string {
  const v = typeof kmh === "number" && Number.isFinite(kmh) ? kmh : 0;
  if (v < 20) return "#3b82f6";
  if (v < 40) return "#22c55e";
  if (v < 60) return "#eab308";
  if (v < 80) return "#f97316";
  return "#ef4444";
}

/**
 * Desenha o rastro como uma sequência de segmentos coloridos pela velocidade
 * do ponto inicial de cada segmento. Fallback: se todos os pontos não tiverem
 * velocidade, desenha uma polyline única verde.
 */
export function SpeedPolyline({ points }: { points: SpeedSample[] }) {
  if (points.length < 2) return null;

  const hasSpeed = points.some((p) => typeof p.speed === "number");
  if (!hasSpeed) {
    return (
      <>
        <Polyline
          positions={points.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.85, lineCap: "round" }}
        />
        <Polyline
          positions={points.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.35, dashArray: "2 6" }}
        />
      </>
    );
  }

  return (
    <>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        return (
          <Polyline
            key={i}
            positions={[
              [p.lat, p.lng],
              [next.lat, next.lng],
            ]}
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

export function SpeedLegend() {
  const items: { color: string; label: string }[] = [
    { color: "#3b82f6", label: "0–20" },
    { color: "#22c55e", label: "20–40" },
    { color: "#eab308", label: "40–60" },
    { color: "#f97316", label: "60–80" },
    { color: "#ef4444", label: "80+" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 500,
        pointerEvents: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
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
      <span style={{ opacity: 0.7 }}>km/h</span>
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
          <span style={{ tabularNums: "true" as unknown as undefined }}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}
