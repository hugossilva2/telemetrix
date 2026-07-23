import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { ArrowLeft, Clock, Fuel, Gauge, Route as RouteIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDecimal, formatSpeed } from "@/lib/format";
import { formatDateTime, formatDurationBetween, formatTime } from "@/lib/trips/format";

const TripMap = lazy(() => import("@/components/trips/TripMap"));

export const Route = createFileRoute("/_authenticated/viagens/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da viagem · Gestão Veicular" },
      { name: "description", content: "Relatório completo da viagem: rota, duração, consumo e custo estimado." },
      { property: "og:title", content: "Detalhe da viagem · Gestão Veicular" },
      { property: "og:description", content: "Relatório completo da viagem." },
    ],
  }),
  component: TripDetailPage,
});

type TripDetail = {
  id: string;
  start_time: string;
  end_time: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  mileage_at_start: number | null;
  mileage_at_end: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
};

function TripDetailPage() {
  const { id } = Route.useParams();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async (): Promise<TripDetail | null> => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id,start_time,end_time,start_lat,start_lng,end_lat,end_lng,distance_km,avg_speed_kmh,max_speed_kmh,mileage_at_start,mileage_at_end,fuel_liters,estimated_cost",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as TripDetail | null;
    },
  });

  const mapFallback = (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  );

  return (
    <AppShell
      title="Viagem"
      subtitle={trip ? formatDateTime(trip.start_time) : "Detalhe"}
    >
      <Link
        to="/viagens"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Voltar
      </Link>

      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !trip ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Viagem não encontrada.</p>
      ) : (
        <>
          <div className="h-64 overflow-hidden rounded-2xl border border-border">
            <ClientOnly fallback={mapFallback}>
              <Suspense fallback={mapFallback}>
                <TripMap
                  start={
                    trip.start_lat != null && trip.start_lng != null
                      ? [trip.start_lat, trip.start_lng]
                      : null
                  }
                  end={
                    trip.end_lat != null && trip.end_lng != null
                      ? [trip.end_lat, trip.end_lng]
                      : null
                  }
                />
              </Suspense>
            </ClientOnly>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Início
              </div>
              <div className="text-sm font-medium tabular-nums">
                {formatTime(trip.start_time)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">→</div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Fim
              </div>
              <div className="text-sm font-medium tabular-nums">
                {trip.end_time ? formatTime(trip.end_time) : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat
              Icon={Clock}
              label="Duração"
              value={formatDurationBetween(trip.start_time, trip.end_time)}
            />
            <Stat
              Icon={RouteIcon}
              label="Distância"
              value={
                trip.distance_km != null ? `${formatDecimal(trip.distance_km)} km` : "—"
              }
            />
            <Stat
              Icon={Gauge}
              label="Vel. média"
              value={
                trip.avg_speed_kmh != null
                  ? formatSpeed(Math.round(trip.avg_speed_kmh))
                  : "—"
              }
            />
            <Stat
              Icon={Gauge}
              label="Vel. máxima"
              value={
                trip.max_speed_kmh != null
                  ? formatSpeed(Math.round(trip.max_speed_kmh))
                  : "—"
              }
            />
            <Stat
              Icon={Fuel}
              label="Combustível"
              value={
                trip.fuel_liters != null
                  ? `${formatDecimal(trip.fuel_liters)} L`
                  : "—"
              }
            />
            <Stat
              Icon={Fuel}
              label="Custo estimado"
              value={trip.estimated_cost != null ? formatBRL(trip.estimated_cost) : "—"}
              highlight
            />
          </div>

          {(trip.mileage_at_start != null || trip.mileage_at_end != null) && (
            <p className="mt-3 text-center text-xs text-muted-foreground tabular-nums">
              Odômetro: {trip.mileage_at_start != null ? Math.round(trip.mileage_at_start) : "—"}
              {" → "}
              {trip.mileage_at_end != null ? Math.round(trip.mileage_at_end) : "—"} km
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

function Stat({
  Icon,
  label,
  value,
  highlight,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight ? "text-emerald-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
