import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FuelKind } from "@/lib/vehicles/specs";
import type { HabitsAnalysis } from "@/lib/coach/habits.types";

/** Gera recomendações automáticas de condução com base nas últimas N viagens. */
export const analyzeDrivingHabits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { fuel?: FuelKind; limit?: number }) => {
    const fuel = data?.fuel;
    const limit = Number(data?.limit ?? 20);
    return {
      fuel: (fuel === "etanol" || fuel === "gasolina" ? fuel : "misto") as FuelKind,
      limit: Number.isFinite(limit) ? Math.min(50, Math.max(5, Math.round(limit))) : 20,
    };
  })
  .handler(async ({ data, context }): Promise<HabitsAnalysis> => {
    const { supabase } = context;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("O coach de direção está indisponível no momento.");

    const { data: rows, error } = await supabase
      .from("trips")
      .select(
        "id,start_time,end_time,distance_km,avg_speed_kmh,max_speed_kmh,fuel_liters,estimated_cost,eco_score,idle_seconds,wasted_fuel_liters,wasted_cost,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count",
      )
      .order("start_time", { ascending: false })
      .limit(data.limit);
    if (error) {
      console.error("[habits] falha ao carregar o histórico de viagens", error);
      throw new Error("Não foi possível carregar seu histórico de viagens.");
    }

    const trips = rows ?? [];
    if (trips.length < 3)
      throw new Error("Precisamos de pelo menos 3 viagens registradas para gerar recomendações.");

    const n = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const avg = (list: number[]) =>
      list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;

    const totalKm = trips.reduce((s, t) => s + n(t.distance_km), 0);
    const totalLiters = trips.reduce((s, t) => s + n(t.fuel_liters), 0);
    const totalCost = trips.reduce((s, t) => s + n(t.estimated_cost), 0);
    const idleMinutes = trips.reduce((s, t) => s + n(t.idle_seconds), 0) / 60;
    const wastedLiters = trips.reduce((s, t) => s + n(t.wasted_fuel_liters), 0);
    const wastedCost = trips.reduce((s, t) => s + n(t.wasted_cost), 0);

    const scores = trips
      .map((t) => Number(t.eco_score))
      .filter((v) => Number.isFinite(v)) as number[];
    const kmpls = trips
      .map((t) => (n(t.fuel_liters) > 0 ? n(t.distance_km) / n(t.fuel_liters) : null))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);

    const counts = {
      harsh_brake: trips.reduce((s, t) => s + n(t.harsh_brake_count), 0),
      harsh_accel: trips.reduce((s, t) => s + n(t.harsh_accel_count), 0),
      harsh_corner: trips.reduce((s, t) => s + n(t.harsh_corner_count), 0),
      overspeed: trips.reduce((s, t) => s + n(t.overspeed_count), 0),
      high_rpm: trips.reduce((s, t) => s + n(t.high_rpm_count), 0),
    };
    const per100: Record<string, number> = {};
    for (const [key, value] of Object.entries(counts)) {
      per100[key] = totalKm > 0 ? (value / totalKm) * 100 : 0;
    }
    const worstEvent =
      Object.entries(counts)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const half = Math.max(1, Math.floor(scores.length / 2));
    const recentAvg = avg(scores.slice(0, half));
    const olderAvg = avg(scores.slice(half));
    const scoreTrend = recentAvg != null && olderAvg != null ? recentAvg - olderAvg : null;

    const nightTrips = trips.filter((t) => new Date(t.start_time).getHours() >= 20).length;
    const shortTrips = trips.filter((t) => n(t.distance_km) > 0 && n(t.distance_km) < 5).length;

    const { buildHabitsPrompt, requestHabits } = await import("@/lib/coach/habits.server");

    const agg = {
      trips: trips.length,
      fromISO: trips[trips.length - 1]?.start_time ?? null,
      toISO: trips[0]?.start_time ?? null,
      totalKm,
      totalLiters,
      totalCost,
      avgEcoScore: avg(scores),
      avgKmpl: totalLiters > 0 ? totalKm / totalLiters : avg(kmpls),
      avgSpeedKmh: avg(
        trips.map((t) => Number(t.avg_speed_kmh)).filter((v) => Number.isFinite(v)) as number[],
      ),
      maxSpeedKmh: Math.max(0, ...trips.map((t) => n(t.max_speed_kmh))) || null,
      idleMinutes,
      wastedLiters,
      wastedCost,
      eventsPer100Km: per100,
      worstEvent,
      scoreTrend,
      nightTrips,
      shortTrips,
    };

    const prompt = buildHabitsPrompt({ agg, fuel: data.fuel });
    return requestHabits({ prompt, apiKey, agg });
  });
