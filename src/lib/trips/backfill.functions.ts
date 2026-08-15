import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FLESPI_CONFIG } from "@/lib/flespi/config";
import { haversineKm } from "@/lib/trips/geo";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import { reconstructTrips, type FlespiMessage } from "@/lib/trips/reconstruct";
import { summarizeEco } from "@/lib/eco/score";

/**
 * Importa o histórico de mensagens armazenado na Flespi e reconstrói as
 * viagens que não chegaram ao app (token expirado, app fechado, etc.).
 */
export const backfillTripsFromFlespi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(Math.max(Number(input?.days) || 7, 1), 60),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const to = Math.floor(Date.now() / 1000);
    const from = to - data.days * 86400;

    const params = new URLSearchParams({
      data: JSON.stringify({
        from,
        to,
        fields:
          "timestamp,engine.ignition.status,vehicle.mileage,position.latitude,position.longitude,position.speed,position.direction,can.engine.rpm,can.engine.load.level,can.vehicle.speed",
      }),
    });

    const res = await fetch(
      `https://flespi.io/gw/devices/${FLESPI_CONFIG.deviceId}/messages?${params}`,
      { headers: { Authorization: `FlespiToken ${FLESPI_CONFIG.token}` } },
    );
    if (!res.ok) {
      throw new Error(`Flespi respondeu ${res.status}`);
    }
    const json = (await res.json()) as { result?: FlespiMessage[] };
    const messages = json.result ?? [];

    const trips = reconstructTrips(messages, haversineKm);
    if (trips.length === 0) {
      return { fetched: messages.length, found: 0, imported: 0, duplicates: 0 };
    }

    const [{ data: vehicle }, { data: lastFuel }, { data: existing }] = await Promise.all([
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
      supabase
        .from("trips")
        .select("start_time")
        .eq("user_id", userId)
        .gte("start_time", new Date(from * 1000).toISOString()),
    ]);

    const kmpl = Number(vehicle?.avg_consumption_kmpl) || 10;
    const price = Number(lastFuel?.price_per_liter) || DEFAULT_GAS_PRICE_PER_LITER;
    const existingMs = (existing ?? []).map((t) => new Date(t.start_time).getTime());

    const rows = trips
      .filter((t) => !existingMs.some((ms) => Math.abs(ms - t.startMs) < 5 * 60_000))
      .map((t) => {
        const durationH = (t.endMs - t.startMs) / 3_600_000;
        const fuelLiters = kmpl > 0 ? t.distanceKm / kmpl : null;
        const eco = summarizeEco({
          events: t.ecoEvents,
          idleSeconds: t.idleSeconds,
          distanceKm: t.distanceKm,
          kmpl,
          pricePerLiter: price,
        });
        return {
          user_id: userId,
          vehicle_id: vehicle?.id ?? null,
          start_time: new Date(t.startMs).toISOString(),
          end_time: new Date(t.endMs).toISOString(),
          start_lat: t.startLat,
          start_lng: t.startLng,
          end_lat: t.endLat,
          end_lng: t.endLng,
          distance_km: t.distanceKm,
          avg_speed_kmh: durationH > 0 ? t.distanceKm / durationH : 0,
          max_speed_kmh: t.maxSpeedKmh || null,
          mileage_at_start: t.mileageStart,
          mileage_at_end: t.mileageEnd,
          fuel_liters: fuelLiters,
          estimated_cost: fuelLiters != null ? fuelLiters * price : null,
          eco_score: eco.score,
          harsh_brake_count: eco.counts.harsh_brake,
          harsh_accel_count: eco.counts.harsh_accel,
          harsh_corner_count: eco.counts.harsh_corner,
          overspeed_count: eco.counts.overspeed,
          high_rpm_count: eco.counts.high_rpm,
          idle_seconds: eco.idleSeconds,
          wasted_fuel_liters: eco.wastedFuelLiters,
          wasted_cost: eco.wastedCost,
          eco_events: t.ecoEvents as unknown as never,
        };
      });

    if (rows.length > 0) {
      // Ignora silenciosamente viagens que já existem (mesmo veículo + início).
      const { error } = await supabase
        .from("trips")
        .upsert(rows, { onConflict: "vehicle_id,start_time", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }

    return {
      fetched: messages.length,
      found: trips.length,
      imported: rows.length,
      duplicates: trips.length - rows.length,
    };
  });
