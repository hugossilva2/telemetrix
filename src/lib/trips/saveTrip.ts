import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/trips/geo";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import type { OpenTrip } from "@/lib/trips/store";
import { summarizeEco } from "@/lib/eco/score";
import { getDefaultDriverId } from "@/lib/drivers/api";
import { telemetrySourceStore } from "@/lib/telemetry/source";
import { offlineQueue } from "@/lib/offline/queue";
import { isOnline } from "@/lib/offline/sync";
import { snapToRoads } from "@/lib/maps/snapToRoads.functions";
import { buildRouteData } from "@/lib/trips/routeData";


const MIN_DISTANCE_KM = 0.2;
const MIN_DURATION_S = 60;

function trailDistanceKm(trip: OpenTrip) {
  let km = 0;
  for (let i = 1; i < trip.trail.length; i++) {
    const a = trip.trail[i - 1];
    const b = trip.trail[i];
    km += haversineKm(a.lat, a.lng, b.lat, b.lng);
  }
  return km;
}

/**
 * Fallback de persistência: grava a viagem encerrada direto do app quando o
 * motor desliga. O webhook do Flespi (quando configurado) também grava; por
 * isso checamos se já existe uma viagem com o mesmo start_time antes de inserir.
 */
export async function saveClosedTrip(
  trip: OpenTrip,
): Promise<"saved" | "skipped" | "duplicate" | "queued"> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return "skipped";

  const startMs = new Date(trip.startTime).getTime();
  const durationS = Math.max(0, (Date.now() - startMs) / 1000);

  const mileageDelta =
    trip.mileageAtStart != null && trip.lastMileage != null
      ? Math.max(0, trip.lastMileage - trip.mileageAtStart)
      : 0;
  const distanceKm = mileageDelta > 0 ? mileageDelta : trailDistanceKm(trip);

  if (distanceKm < MIN_DISTANCE_KM && durationS < MIN_DURATION_S) return "skipped";

  // Evita duplicar o que o webhook possa ter gravado (janela de ±3 min).
  const { data: existing } = await supabase
    .from("trips")
    .select("id")
    .gte("start_time", new Date(startMs - 3 * 60_000).toISOString())
    .lte("start_time", new Date(startMs + 3 * 60_000).toISOString())
    .limit(1);
  if (existing && existing.length > 0) return "duplicate";


  const [{ data: vehicle }, { data: lastFuel }, driverId] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,avg_consumption_kmpl")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fuel_logs")
      .select("price_per_liter")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDefaultDriverId(userId),
  ]);

  const durationH = durationS / 3600;
  const avgSpeedKmh = durationH > 0 ? distanceKm / durationH : null;
  const fuel = getFuelKind();
  // Sem consumo cadastrado, usa a meta Inmetro da ficha técnica do veículo.
  const kmpl =
    Number(vehicle?.avg_consumption_kmpl) || expectedKmpl({ fuel, avgSpeedKmh });
  const price = Number(lastFuel?.price_per_liter) || DEFAULT_GAS_PRICE_PER_LITER;
  const fuelLiters = kmpl > 0 ? distanceKm / kmpl : null;
  const estimatedCost = fuelLiters != null ? fuelLiters * price : null;

  const eco = summarizeEco({
    events: trip.ecoEvents ?? [],
    idleSeconds: trip.idleSeconds ?? 0,
    distanceKm,
    kmpl,
    pricePerLiter: price,
    fuel,
    avgSpeedKmh,
  });


  const source = telemetrySourceStore.get();

  // Map Matching: alinha o traçado à geometria real das ruas (Google Roads API).
  // Falha de rede/API não bloqueia o salvamento — cai para os pontos brutos.
  let snappedPoints = null as Awaited<ReturnType<typeof snapToRoads>>["points"] | null;
  if (isOnline() && (trip.trail?.length ?? 0) > 1) {
    try {
      const res = await snapToRoads({
        data: { points: trip.trail.map((p) => ({ lat: p.lat, lng: p.lng })) },
      });
      if (res.snapped) snappedPoints = res.points;
    } catch (err) {
      console.error("[saveTrip] snapToRoads falhou, usando traçado bruto:", err);
    }
  }

  const routeData = buildRouteData({
    trail: trip.trail ?? [],
    events: trip.ecoEvents ?? [],
    source,
    snappedPoints,
  });

  const row = {
    user_id: userId,
    vehicle_id: vehicle?.id ?? null,
    driver_id: driverId,
    start_time: trip.startTime,
    end_time: new Date().toISOString(),
    start_lat: trip.startLat,
    start_lng: trip.startLng,
    end_lat: trip.lastLat,
    end_lng: trip.lastLng,
    distance_km: distanceKm,
    avg_speed_kmh: durationH > 0 ? distanceKm / durationH : 0,
    max_speed_kmh: trip.maxSpeedKmh || null,
    mileage_at_start: trip.mileageAtStart,
    mileage_at_end: trip.lastMileage,
    fuel_liters: fuelLiters,
    estimated_cost: estimatedCost,
    eco_score: eco.score,
    harsh_brake_count: eco.counts.harsh_brake,
    harsh_accel_count: eco.counts.harsh_accel,
    harsh_corner_count: eco.counts.harsh_corner,
    overspeed_count: eco.counts.overspeed,
    high_rpm_count: eco.counts.high_rpm,
    idle_seconds: eco.idleSeconds,
    wasted_fuel_liters: eco.wastedFuelLiters,
    wasted_cost: eco.wastedCost,
    eco_events: (trip.ecoEvents ?? []) as unknown as never,
    hardware_source: source,
    route_data: (routeData ?? null) as unknown as never,
  };

  // Offline-first: sem rede, a viagem vai para a fila local (IndexedDB).
  if (!isOnline()) {
    await offlineQueue.enqueue("trip", row as unknown as Record<string, unknown>);
    return "queued";
  }

  const { error } = await supabase.from("trips").insert(row);

  if (error) {
    await offlineQueue.enqueue("trip", row as unknown as Record<string, unknown>);
    return "queued";
  }
  return "saved";

}
