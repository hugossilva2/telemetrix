import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeDriverScore, type DriverScore } from "./score";
import { getFuelKind } from "@/lib/eco/settings";
import type { DriverSafeStartRow, DriverTripRow } from "./score";
import { DRIVER_COLUMNS, type DriverRow } from "./api";

const TRIP_COLUMNS =
  "id,driver_id,start_time,end_time,distance_km,fuel_liters,estimated_cost,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count,idle_seconds,wasted_fuel_liters,wasted_cost,max_speed_kmh";

export interface RankedDriver {
  driver: DriverRow;
  result: DriverScore;
}

/** Nota consolidada de todos os condutores, ordenada do melhor para o pior. */
export function useDriverRanking() {
  return useQuery<RankedDriver[]>({
    queryKey: ["driver-ranking"],
    queryFn: async () => {
      const [drivers, trips, starts] = await Promise.all([
        supabase.from("drivers").select(DRIVER_COLUMNS).order("name"),
        supabase
          .from("trips")
          .select(TRIP_COLUMNS)
          .not("driver_id", "is", null)
          .order("start_time", { ascending: false })
          .limit(1000),
        supabase
          .from("safe_starts")
          .select("driver_id,started_at,required,ready,min_rpm")
          .not("driver_id", "is", null)
          .order("started_at", { ascending: false })
          .limit(500),
      ]);

      if (drivers.error) throw drivers.error;
      if (trips.error) throw trips.error;
      if (starts.error) throw starts.error;

      const tripsBy = new Map<string, DriverTripRow[]>();
      for (const t of trips.data ?? []) {
        const key = (t as { driver_id: string }).driver_id;
        const list = tripsBy.get(key) ?? [];
        list.push(t as unknown as DriverTripRow);
        tripsBy.set(key, list);
      }

      const startsBy = new Map<string, DriverSafeStartRow[]>();
      for (const s of starts.data ?? []) {
        const key = (s as { driver_id: string }).driver_id;
        const list = startsBy.get(key) ?? [];
        list.push(s as unknown as DriverSafeStartRow);
        startsBy.set(key, list);
      }

      return ((drivers.data ?? []) as DriverRow[])
        .map((driver) => ({
          driver,
          result: computeDriverScore(tripsBy.get(driver.id) ?? [], startsBy.get(driver.id) ?? [], { fuel: getFuelKind() }),
        }))
        .sort((a, b) => {
          const sa = a.result.score ?? -1;
          const sb = b.result.score ?? -1;
          if (sb !== sa) return sb - sa;
          return b.result.stats.distanceKm - a.result.stats.distanceKm;
        });
    },
  });
}

/** Condutor padrão (ou o melhor colocado) para destaque no Painel. */
export function useHighlightDriver() {
  const query = useDriverRanking();
  const list = query.data ?? [];
  const highlight = list.find((r) => r.driver.is_default) ?? list[0] ?? null;
  return { ...query, highlight, ranking: list };
}
