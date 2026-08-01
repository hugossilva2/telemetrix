import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FuelKind } from "@/lib/vehicles/specs";
import { normalizeGrade, parseTips, type TripCoaching } from "@/lib/coach/types";

/** Gera (ou regenera) a análise de direção da viagem com a Lovable AI. */
export const analyzeTripCoaching = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tripId: string; fuel?: FuelKind; force?: boolean }) => {
    const tripId = String(data?.tripId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(tripId)) throw new Error("Viagem inválida");
    const fuel = data?.fuel;
    return {
      tripId,
      fuel: (fuel === "etanol" || fuel === "gasolina" ? fuel : "misto") as FuelKind,
      force: data?.force === true,
    };
  })
  .handler(async ({ data, context }): Promise<TripCoaching> => {
    const { supabase, userId } = context;

    if (!data.force) {
      const { data: cached } = await supabase
        .from("trip_coachings")
        .select("trip_id,grade,headline,summary,tips,comparison,highlight,created_at")
        .eq("trip_id", data.tripId)
        .maybeSingle();
      if (cached) {
        return {
          tripId: cached.trip_id,
          grade: normalizeGrade(cached.grade),
          headline: cached.headline,
          summary: cached.summary,
          tips: parseTips(cached.tips),
          comparison: cached.comparison,
          highlight: cached.highlight,
          createdAt: cached.created_at,
        };
      }
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("IA não configurada neste projeto.");

    const { data: trip, error } = await supabase
      .from("trips")
      .select(
        "id,start_time,end_time,distance_km,avg_speed_kmh,max_speed_kmh,fuel_liters,estimated_cost,eco_score,idle_seconds,wasted_fuel_liters,wasted_cost,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count",
      )
      .eq("id", data.tripId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!trip) throw new Error("Viagem não encontrada.");

    const { data: history } = await supabase
      .from("trips")
      .select(
        "distance_km,fuel_liters,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count",
      )
      .neq("id", data.tripId)
      .order("start_time", { ascending: false })
      .limit(20);

    const { buildCoachPrompt, requestCoaching } = await import("@/lib/coach/coach.server");

    const rows = history ?? [];
    const scores = rows.map((r) => Number(r.eco_score)).filter((v) => Number.isFinite(v));
    const kmpls = rows
      .map((r) =>
        r.distance_km && r.fuel_liters && Number(r.fuel_liters) > 0
          ? Number(r.distance_km) / Number(r.fuel_liters)
          : null,
      )
      .filter((v): v is number => v != null && Number.isFinite(v));
    const totalKm = rows.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0);
    const totalEvents = rows.reduce(
      (sum, r) =>
        sum +
        (r.harsh_brake_count ?? 0) +
        (r.harsh_accel_count ?? 0) +
        (r.harsh_corner_count ?? 0) +
        (r.overspeed_count ?? 0) +
        (r.high_rpm_count ?? 0),
      0,
    );
    const avg = (list: number[]) =>
      list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;

    const durationMin =
      trip.end_time != null
        ? (new Date(trip.end_time).getTime() - new Date(trip.start_time).getTime()) / 60_000
        : null;

    const prompt = buildCoachPrompt({
      fuel: data.fuel,
      trip: {
        distanceKm: trip.distance_km,
        durationMin,
        avgSpeedKmh: trip.avg_speed_kmh,
        maxSpeedKmh: trip.max_speed_kmh,
        fuelLiters: trip.fuel_liters,
        estimatedCost: trip.estimated_cost,
        ecoScore: trip.eco_score,
        idleSeconds: trip.idle_seconds,
        wastedFuelLiters: trip.wasted_fuel_liters,
        wastedCost: trip.wasted_cost,
        counts: {
          harsh_brake: trip.harsh_brake_count ?? 0,
          harsh_accel: trip.harsh_accel_count ?? 0,
          harsh_corner: trip.harsh_corner_count ?? 0,
          overspeed: trip.overspeed_count ?? 0,
          high_rpm: trip.high_rpm_count ?? 0,
        },
      },
      history: {
        trips: rows.length,
        avgEcoScore: avg(scores),
        avgKmpl: avg(kmpls),
        avgEventsPer100Km: totalKm > 0 ? (totalEvents / totalKm) * 100 : null,
      },
    });

    const result = await requestCoaching({ prompt, apiKey });

    const { data: saved, error: saveError } = await supabase
      .from("trip_coachings")
      .upsert(
        {
          trip_id: data.tripId,
          user_id: userId,
          grade: result.grade,
          headline: result.headline,
          summary: result.summary,
          tips: result.tips as unknown as Json,
          comparison: result.comparison,
          highlight: result.highlight,
          model: result.model,
        },
        { onConflict: "trip_id" },
      )
      .select("created_at")
      .maybeSingle();
    if (saveError) console.error("[coach] falha ao salvar análise:", saveError.message);

    return {
      tripId: data.tripId,
      grade: result.grade,
      headline: result.headline,
      summary: result.summary,
      tips: result.tips,
      comparison: result.comparison,
      highlight: result.highlight,
      createdAt: saved?.created_at ?? new Date().toISOString(),
    };
  });
