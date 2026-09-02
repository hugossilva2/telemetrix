import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RidePlatform } from "./profit";

export const RIDES_KEY = ["rides"] as const;
export const SHIFTS_KEY = ["shifts"] as const;
export const PROFIT_COSTS_KEY = ["profit-costs"] as const;

export interface RideRecord {
  id: string;
  vehicle_id: string | null;
  shift_id: string | null;
  trip_id: string | null;
  platform: RidePlatform;
  amount: number;
  tip: number;
  distance_km: number | null;
  duration_min: number | null;
  occurred_at: string;
  notes: string | null;
}

export interface ShiftRecord {
  id: string;
  vehicle_id: string | null;
  started_at: string;
  ended_at: string | null;
  start_mileage: number | null;
  end_mileage: number | null;
  notes: string | null;
}

const RIDE_SELECT = "id,vehicle_id,shift_id,trip_id,platform,amount,tip,distance_km,duration_min,occurred_at,notes";
const SHIFT_SELECT = "id,vehicle_id,started_at,ended_at,start_mileage,end_mileage,notes";

/** Corridas desde `since` (ISO); padrão: últimos 60 dias. */
export function useRides(since?: string) {
  const from = since ?? new Date(Date.now() - 60 * 86_400_000).toISOString();
  return useQuery({
    queryKey: [...RIDES_KEY, from.slice(0, 10)],
    queryFn: async (): Promise<RideRecord[]> => {
      const { data, error } = await supabase
        .from("rides")
        .select(RIDE_SELECT)
        .gte("occurred_at", from)
        .order("occurred_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        amount: Number(r.amount),
        tip: Number(r.tip),
        distance_km: r.distance_km === null ? null : Number(r.distance_km),
      })) as RideRecord[];
    },
  });
}

export function useShifts(since?: string) {
  const from = since ?? new Date(Date.now() - 60 * 86_400_000).toISOString();
  return useQuery({
    queryKey: [...SHIFTS_KEY, from.slice(0, 10)],
    queryFn: async (): Promise<ShiftRecord[]> => {
      const { data, error } = await supabase
        .from("shifts")
        .select(SHIFT_SELECT)
        .or(`started_at.gte.${from},ended_at.is.null`)
        .order("started_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        start_mileage: s.start_mileage === null ? null : Number(s.start_mileage),
        end_mileage: s.end_mileage === null ? null : Number(s.end_mileage),
      })) as ShiftRecord[];
    },
  });
}

/** Turno em aberto (sem fim), se houver. */
export function useOpenShift() {
  const q = useShifts();
  return { ...q, shift: q.data?.find((s) => s.ended_at === null) ?? null };
}

/** Custos para o lucro: abastecimentos e despesas (sem a categoria combustível, já coberta). */
export function useProfitCosts(since?: string) {
  const from = since ?? new Date(Date.now() - 60 * 86_400_000).toISOString();
  return useQuery({
    queryKey: [...PROFIT_COSTS_KEY, from.slice(0, 10)],
    queryFn: async () => {
      const [fuel, expenses] = await Promise.all([
        supabase.from("fuel_logs").select("date,total_cost").gte("date", from).limit(1000),
        supabase
          .from("expenses")
          .select("expense_date,amount,category")
          .gte("expense_date", from.slice(0, 10))
          .neq("category", "combustivel")
          .limit(1000),
      ]);
      if (fuel.error) throw fuel.error;
      if (expenses.error) throw expenses.error;
      return {
        fuel: (fuel.data ?? []).map((f) => ({ date: f.date, amount: Number(f.total_cost) })),
        expenses: (expenses.data ?? []).map((e) => ({
          // Datas sem hora viram meio-dia local para caírem no dia certo.
          date: `${e.expense_date}T12:00:00`,
          amount: Number(e.amount),
        })),
      };
    },
  });
}

export function invalidateRides(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: RIDES_KEY });
  qc.invalidateQueries({ queryKey: SHIFTS_KEY });
  qc.invalidateQueries({ queryKey: PROFIT_COSTS_KEY });
}
