import type { SupabaseClient } from "@supabase/supabase-js";
import { haversineKm } from "@/lib/trips/geo";
import { buildRouteData, type RouteData } from "@/lib/trips/routeData";
import type { TrailPoint } from "@/lib/trips/store";
import { snapTrail } from "@/lib/maps/snapToRoads.server";

/** Máximo de pontos enviados ao Snap to Roads (≈2 requisições Google por viagem). */
export const MAX_SNAP_POINTS = 200;
/** Ruído de GPS: descarta deslocamentos menores que 5 metros. */
const MIN_STEP_KM = 0.005;

type PingRow = {
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  recorded_at: string;
};

/** Reduz a lista por amostragem uniforme mantendo primeiro e último ponto. */
export function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const out: T[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]!);
  return out;
}

/** Lê os pings gravados na janela da viagem e devolve o rastro limpo. */
export async function trailFromPings(
  client: SupabaseClient<never, never, never>,
  params: { vehicleId: string; startIso: string; endIso: string },
): Promise<TrailPoint[]> {
  const { data, error } = await (client as unknown as SupabaseClient)
    .from("tracker_pings")
    .select("lat,lng,speed_kmh,recorded_at")
    .eq("vehicle_id", params.vehicleId)
    .gte("recorded_at", params.startIso)
    .lte("recorded_at", params.endIso)
    .order("recorded_at", { ascending: true })
    .limit(2000);
  if (error) throw error;

  const rows = ((data ?? []) as PingRow[]).filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number",
  );

  const clean: TrailPoint[] = [];
  for (const r of rows) {
    const pt: TrailPoint = {
      lat: r.lat as number,
      lng: r.lng as number,
      speed: typeof r.speed_kmh === "number" ? r.speed_kmh : null,
      t: Date.parse(r.recorded_at),
    };
    if (!Number.isFinite(pt.t)) continue;
    const last = clean[clean.length - 1];
    if (last && haversineKm(last.lat, last.lng, pt.lat, pt.lng) < MIN_STEP_KM) continue;
    clean.push(pt);
  }

  return downsample(clean, MAX_SNAP_POINTS);
}

/**
 * Monta o JSON de traçado de uma viagem a partir dos pings gravados,
 * encaixando nas ruas quando o Google responder.
 */
export async function buildRouteDataFromPings(
  client: SupabaseClient<never, never, never>,
  params: { vehicleId: string; startIso: string; endIso: string; source: string },
): Promise<RouteData | null> {
  const trail = await trailFromPings(client, params);
  if (trail.length < 2) return null;

  const snap = await snapTrail(
    trail.map((p) => ({ lat: p.lat, lng: p.lng })),
    MAX_SNAP_POINTS,
  );

  return buildRouteData({
    trail,
    source: params.source,
    snappedPoints: snap.snapped ? snap.points : null,
  });
}
