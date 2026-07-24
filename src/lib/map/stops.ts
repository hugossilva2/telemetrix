import { haversineKm } from "@/lib/trips/geo";

export type StopSample = {
  lat: number;
  lng: number;
  speed?: number | null;
  t?: number;
};

export type DetectedStop = {
  lat: number;
  lng: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
};

/**
 * Detecta paradas: clusters de pontos consecutivos onde o veículo ficou
 * dentro de um raio pequeno por pelo menos `minMs` ms. Só considera pontos
 * com timestamp (`t`).
 */
export function detectStops(
  points: StopSample[],
  opts: { minMs?: number; radiusKm?: number } = {},
): DetectedStop[] {
  const minMs = opts.minMs ?? 2 * 60 * 1000;
  const radiusKm = opts.radiusKm ?? 0.03; // 30 m
  const out: DetectedStop[] = [];
  if (points.length < 2) return out;

  let anchor: StopSample | null = null;
  let anchorIdx = -1;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (typeof p.t !== "number") continue;
    if (!anchor) {
      anchor = p;
      anchorIdx = i;
      continue;
    }
    const d = haversineKm(anchor.lat, anchor.lng, p.lat, p.lng);
    if (d > radiusKm) {
      const prev = points[i - 1];
      if (
        prev &&
        typeof prev.t === "number" &&
        anchor.t != null &&
        prev.t - anchor.t >= minMs &&
        i - 1 > anchorIdx
      ) {
        out.push({
          lat: anchor.lat,
          lng: anchor.lng,
          startedAt: anchor.t,
          endedAt: prev.t,
          durationMs: prev.t - anchor.t,
        });
      }
      anchor = p;
      anchorIdx = i;
    }
  }

  // trailing cluster
  const last = points[points.length - 1];
  if (
    anchor &&
    last &&
    typeof last.t === "number" &&
    anchor.t != null &&
    last.t - anchor.t >= minMs &&
    points.length - 1 > anchorIdx
  ) {
    out.push({
      lat: anchor.lat,
      lng: anchor.lng,
      startedAt: anchor.t,
      endedAt: last.t,
      durationMs: last.t - anchor.t,
    });
  }

  return out;
}

export function formatStopDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
}
