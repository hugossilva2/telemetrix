import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RebuildRoutesInput = {
  /** Janela em dias (padrão 30, máximo 60). */
  days?: number;
  /** Viagens processadas por chamada (padrão 8, máximo 15). */
  limit?: number;
};

export type RebuildRoutesResult = {
  /** Viagens com traçado gravado nesta chamada. */
  processed: number;
  /** Quantas ficaram alinhadas às ruas pelo Google. */
  snapped: number;
  /** Viagens sem pings suficientes (não têm como reconstruir). */
  skipped: number;
  /** Viagens sem traçado que ainda restam na janela. */
  remaining: number;
};

/** Quantas viagens da janela ainda estão sem traçado. */
export const countTripsWithoutRoute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pending: number; total: number }> => {
    const sinceIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const base = context.supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("start_time", sinceIso);
    const [pending, total] = await Promise.all([
      base.is("route_data", null),
      context.supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .gte("start_time", sinceIso),
    ]);
    return { pending: pending.count ?? 0, total: total.count ?? 0 };
  });

/**
 * Reconstrói o traçado de viagens antigas a partir dos pings gravados.
 * Processa em lotes pequenos para caber no tempo de execução; a UI chama
 * repetidamente até `remaining` chegar a zero.
 */
export const rebuildTripRoutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RebuildRoutesInput) => input ?? {})
  .handler(async ({ data, context }): Promise<RebuildRoutesResult> => {
    const days = Math.min(Math.max(Math.trunc(data.days ?? 30), 1), 60);
    const limit = Math.min(Math.max(Math.trunc(data.limit ?? 8), 1), 15);
    const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();

    const { buildRouteDataFromPings } = await import("@/lib/trips/trailFromPings.server");

    const { data: trips, error } = await context.supabase
      .from("trips")
      .select("id,vehicle_id,start_time,end_time,hardware_source")
      .gte("start_time", sinceIso)
      .is("route_data", null)
      .not("vehicle_id", "is", null)
      .not("end_time", "is", null)
      .order("start_time", { ascending: false })
      .limit(limit);
    if (error) throw error;

    let processed = 0;
    let snapped = 0;
    let skipped = 0;

    for (const trip of trips ?? []) {
      try {
        const routeData = await buildRouteDataFromPings(context.supabase, {
          vehicleId: trip.vehicle_id as string,
          startIso: trip.start_time,
          endIso: trip.end_time as string,
          source: trip.hardware_source ?? "fmc003",
        });
        if (!routeData) {
          skipped += 1;
          continue;
        }
        const { error: upErr } = await context.supabase
          .from("trips")
          .update({ route_data: routeData as unknown as never })
          .eq("id", trip.id);
        if (upErr) throw upErr;
        processed += 1;
        if (routeData.snapped) snapped += 1;
      } catch (err) {
        console.error("[rebuildTripRoutes]", trip.id, err);
        skipped += 1;
      }
    }

    const { count } = await context.supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("start_time", sinceIso)
      .is("route_data", null)
      .not("vehicle_id", "is", null)
      .not("end_time", "is", null);

    return { processed, snapped, skipped, remaining: count ?? 0 };
  });
