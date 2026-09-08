import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/trips/geo";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import type { OpenTrip } from "@/lib/trips/store";
import { summarizeEco } from "@/lib/eco/score";
import { getFuelKind } from "@/lib/eco/settings";
import { parseFuelKind, specFromVehicleRow } from "@/lib/vehicles/specs";
import { resolveKmpl, tripFuelLiters } from "@/lib/fuel/consumption";

import { getDefaultDriverId } from "@/lib/drivers/api";
import { telemetrySourceStore } from "@/lib/telemetry/source";
import { offlineQueue } from "@/lib/offline/queue";
import { isOnline } from "@/lib/offline/sync";
import { snapToRoads } from "@/lib/maps/snapToRoads.functions";
import { buildRouteData } from "@/lib/trips/routeData";
import { getActiveVehicleId, VEHICLE_SELECT } from "@/lib/vehicles/active";

import { MIN_DISTANCE_KM, MIN_DURATION_S } from "@/lib/trips/thresholds";

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

  const [{ data: vehicle }, { data: lastFuel }, driverId] = await Promise.all([
    (() => {
      const activeId = getActiveVehicleId();
      const q = supabase.from("vehicles").select(VEHICLE_SELECT).eq("user_id", userId);
      return activeId
        ? q.eq("id", activeId).maybeSingle()
        : q.order("created_at", { ascending: true }).limit(1).maybeSingle();
    })(),
    supabase
      .from("fuel_logs")
      .select("price_per_liter")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDefaultDriverId(userId),
  ]);

  // Evita duplicar o que o webhook possa ter gravado (janela de ±3 min).
  // Restrito ao usuário e ao veículo: o RLS também mostra viagens compartilhadas
  // e de frota, que não devem descartar uma viagem legítima.
  {
    let q = supabase
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .gte("start_time", new Date(startMs - 3 * 60_000).toISOString())
      .lte("start_time", new Date(startMs + 3 * 60_000).toISOString())
      .limit(1);
    q = vehicle?.id ? q.eq("vehicle_id", vehicle.id) : q.is("vehicle_id", null);
    const { data: existing } = await q;
    if (existing && existing.length > 0) return "duplicate";
  }

  const durationH = durationS / 3600;
  const avgSpeedKmh = durationH > 0 ? distanceKm / durationH : null;
  // vehicles.fuel_kind é a fonte de verdade; localStorage só como cache offline.
  const fuel = vehicle?.fuel_kind ? parseFuelKind(vehicle.fuel_kind) : getFuelKind();
  const spec = specFromVehicleRow(vehicle);

  // Calibração medida cheio-a-cheio do veículo, quando existir.
  const { data: calibration } = vehicle?.id
    ? await supabase
        .from("vehicle_fuel_calibration")
        .select("kmpl,samples,fuel_type")
        .eq("vehicle_id", vehicle.id)
        .eq("fuel_type", fuel)
        .maybeSingle()
    : { data: null };

  // Fonte única: calibração medida → consumo cadastrado → ficha técnica.
  const { kmpl, source: fuelSource } = resolveKmpl({
    calibration,
    vehicleKmpl: vehicle?.avg_consumption_kmpl ?? null,
    spec,
    fuel,
    avgSpeedKmh,
  });
  const price = Number(lastFuel?.price_per_liter) || DEFAULT_GAS_PRICE_PER_LITER;
  const idleSeconds = trip.idleSeconds ?? 0;
  const fuelLiters = tripFuelLiters({ distanceKm, kmpl, idleSeconds });
  const estimatedCost = fuelLiters != null ? fuelLiters * price : null;

  const eco = summarizeEco({
    events: trip.ecoEvents ?? [],
    idleSeconds: trip.idleSeconds ?? 0,
    distanceKm,
    kmpl,
    pricePerLiter: price,
    fuel,
    avgSpeedKmh,
    spec,
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
    fuel_kmpl_used: kmpl,
    fuel_source: fuelSource,
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
    // 23505: já existe viagem com o mesmo veículo/horário de início (o webhook
    // gravou primeiro). Não é falha — não vale reenfileirar.
    if ((error as { code?: string }).code === "23505") return "duplicate";
    await offlineQueue.enqueue("trip", row as unknown as Record<string, unknown>);
    return "queued";
  }
  return "saved";
}
