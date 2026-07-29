import type { EcoEvent } from "@/lib/eco/detect";
import type { TrailPoint } from "@/lib/trips/store";
import type { SnappedPoint } from "@/lib/maps/snapToRoads.functions";

/**
 * Estrutura compacta salva na coluna `trips.route_data` (JSONB).
 * Um único documento com o traçado final (alinhado à rua quando possível)
 * e a telemetria de cada ponto — evita uma tabela separada de coordenadas.
 */

export const ROUTE_DATA_VERSION = 1;

/** [lat, lng, t(ms), speed(km/h)|null, rpm|null, accel(km/h/s)|null] */
export type CompactPoint = [
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
];

export interface RouteData {
  version: number;
  /** true quando o traçado passou pelo Snap to Roads */
  snapped: boolean;
  source: string;
  points: CompactPoint[];
  events: Array<{
    type: EcoEvent["type"];
    severity: EcoEvent["severity"];
    t: number;
    lat: number;
    lng: number;
  }>;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  t: number;
  speed: number | null;
  rpm: number | null;
  /** Aceleração longitudinal aproximada em km/h por segundo */
  accel: number | null;
}

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Calcula a aceleração (km/h/s) entre pontos consecutivos. */
export function withAccel(points: Array<Omit<RoutePoint, "accel">>): RoutePoint[] {
  return points.map((p, i) => {
    const prev = points[i - 1];
    if (!prev || typeof p.speed !== "number" || typeof prev.speed !== "number") {
      return { ...p, accel: null };
    }
    const dt = (p.t - prev.t) / 1000;
    if (!Number.isFinite(dt) || dt <= 0 || dt > 60) return { ...p, accel: null };
    return { ...p, accel: round((p.speed - prev.speed) / dt, 2) };
  });
}

/**
 * Monta o JSON final da viagem. `snappedPoints` é opcional: quando presente,
 * cada coordenada corrigida herda a telemetria do ponto bruto de origem
 * (via `originalIndex`); pontos interpolados herdam do último conhecido.
 */
export function buildRouteData(params: {
  trail: TrailPoint[];
  events?: EcoEvent[];
  source: string;
  snappedPoints?: SnappedPoint[] | null;
}): RouteData | null {
  const trail = (params.trail ?? []).filter(
    (p) => typeof p?.lat === "number" && typeof p?.lng === "number",
  );
  if (trail.length < 2) return null;

  const snapped = params.snappedPoints ?? [];
  const useSnapped = snapped.length > 1;

  let base: Array<Omit<RoutePoint, "accel">>;
  if (useSnapped) {
    let lastIdx = 0;
    base = snapped.map((sp) => {
      if (typeof sp.originalIndex === "number" && trail[sp.originalIndex]) {
        lastIdx = sp.originalIndex;
      }
      const src = trail[lastIdx] ?? trail[0];
      return {
        lat: round(sp.lat, 6),
        lng: round(sp.lng, 6),
        t: src.t,
        speed: typeof src.speed === "number" ? round(src.speed, 1) : null,
        rpm: typeof src.rpm === "number" ? Math.round(src.rpm) : null,
      };
    });
  } else {
    base = trail.map((p) => ({
      lat: round(p.lat, 6),
      lng: round(p.lng, 6),
      t: p.t,
      speed: typeof p.speed === "number" ? round(p.speed, 1) : null,
      rpm: typeof p.rpm === "number" ? Math.round(p.rpm) : null,
    }));
  }

  const withA = withAccel(base);

  return {
    version: ROUTE_DATA_VERSION,
    snapped: useSnapped,
    source: params.source,
    points: withA.map(
      (p) => [p.lat, p.lng, p.t, p.speed, p.rpm, p.accel] as CompactPoint,
    ),
    events: (params.events ?? [])
      .filter(
        (e): e is EcoEvent & { lat: number; lng: number } =>
          typeof e.lat === "number" && typeof e.lng === "number",
      )
      .map((e) => ({
        type: e.type,
        severity: e.severity,
        t: e.t,
        lat: round(e.lat, 6),
        lng: round(e.lng, 6),
      })),
  };
}

/** Lê a coluna JSONB de volta para pontos utilizáveis no mapa. */
export function parseRouteData(raw: unknown): {
  snapped: boolean;
  points: RoutePoint[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<RouteData>;
  if (!Array.isArray(data.points) || data.points.length < 2) return null;
  const points: RoutePoint[] = [];
  for (const p of data.points) {
    if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") continue;
    points.push({
      lat: p[0],
      lng: p[1],
      t: typeof p[2] === "number" ? p[2] : 0,
      speed: typeof p[3] === "number" ? p[3] : null,
      rpm: typeof p[4] === "number" ? p[4] : null,
      accel: typeof p[5] === "number" ? p[5] : null,
    });
  }
  if (points.length < 2) return null;
  return { snapped: data.snapped === true, points };
}
