import { useQuery } from "@tanstack/react-query";
import { Clock, Gauge, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDurationBetween } from "@/lib/trips/format";

type TripRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
};

/** Histórico somente leitura das últimas viagens do veículo compartilhado. */
export function ObserverTripsList({ vehicleId }: { vehicleId: string | null }) {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["observer-trips", vehicleId],
    enabled: !!vehicleId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,end_time,distance_km,avg_speed_kmh,max_speed_kmh")
        .eq("vehicle_id", vehicleId!)
        .order("start_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });

  return (
    <div className="card-surface p-4">
      <h2 className="font-display text-sm font-semibold tracking-tight">
        Últimas viagens
      </h2>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : !trips || trips.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma viagem registrada ainda.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {trips.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-border/60 bg-muted/25 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">
                  {formatDateTime(t.start_time)}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {t.end_time ? "encerrada" : "em andamento"}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <RouteIcon className="size-3" />
                  {t.distance_km != null ? `${Number(t.distance_km).toFixed(1)} km` : "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDurationBetween(t.start_time, t.end_time)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="size-3" />
                  {t.avg_speed_kmh != null ? `${Math.round(Number(t.avg_speed_kmh))} km/h méd` : "—"}
                  {t.max_speed_kmh != null
                    ? ` · ${Math.round(Number(t.max_speed_kmh))} máx`
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
