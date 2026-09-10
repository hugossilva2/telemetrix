// Consulta única da lista de viagens: as duas telas (lista e detalhe) usavam a
// mesma chave de cache com selects diferentes, o que fazia campos virarem
// undefined ao voltar do detalhe para a lista.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/paginate";

export const TRIPS_LIST_SELECT =
  "id,start_time,end_time,distance_km,avg_speed_kmh,fuel_liters,estimated_cost,eco_score";

export type TripListRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
  eco_score: number | null;
};

export const TRIPS_LIST_KEY = ["trips-list"] as const;

export async function fetchTrips(): Promise<TripListRow[]> {
  // Paginado: o histórico completo, sem corte silencioso em 500 viagens.
  return fetchAllRows<TripListRow>((from, to) =>
    supabase
      .from("trips")
      .select(TRIPS_LIST_SELECT)
      .order("start_time", { ascending: false })
      .range(from, to),
  );
}

export function useTripsList() {
  return useQuery({
    queryKey: TRIPS_LIST_KEY,
    queryFn: fetchTrips,
  });
}
