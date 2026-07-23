import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Route as RouteIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDecimal } from "@/lib/format";
import { formatDateTime, formatDurationBetween } from "@/lib/trips/format";

export const Route = createFileRoute("/_authenticated/viagens")({
  head: () => ({
    meta: [
      { title: "Viagens · Gestão Veicular" },
      { name: "description", content: "Histórico de viagens com duração, distância e custo estimado." },
      { property: "og:title", content: "Viagens · Gestão Veicular" },
      { property: "og:description", content: "Histórico de viagens com duração, distância e custo estimado." },
    ],
  }),
  component: ViagensPage,
});

type TripRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
};

function ViagensPage() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips-list"],
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,end_time,distance_km,avg_speed_kmh,fuel_liters,estimated_cost")
        .order("start_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });

  return (
    <AppShell title="Viagens" subtitle="Histórico automático">
      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !trips || trips.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <RouteIcon className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhuma viagem ainda</p>
            <p className="text-xs text-muted-foreground">
              A viagem é registrada automaticamente quando você liga e desliga o motor.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                to="/viagens/$id"
                params={{ id: t.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <RouteIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {formatDateTime(t.start_time)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDurationBetween(t.start_time, t.end_time)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    <span>{formatDecimal(t.distance_km ?? undefined)} km</span>
                    {t.avg_speed_kmh != null && (
                      <span>{Math.round(t.avg_speed_kmh)} km/h méd.</span>
                    )}
                    {t.estimated_cost != null && (
                      <span className="text-foreground">{formatBRL(t.estimated_cost)}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
