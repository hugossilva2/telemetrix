import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  Fuel,
  Gauge,
  Leaf,
  Route as RouteIcon,
  TrendingUp,
  TrendingDown,
  CalendarRange,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDecimal, formatSpeed } from "@/lib/format";
import { estimateTripCost } from "@/lib/trips/cost";
import { EcoTripCard, parseEcoEvents } from "@/components/eco/EcoTripCard";
import { EcoEventsChart } from "@/components/eco/EcoEventsChart";
import { parseRouteData } from "@/lib/trips/routeData";
import { formatDateTime, formatDurationBetween, formatTime } from "@/lib/trips/format";
import { DeleteTripButton } from "@/components/trips/DeleteTripButton";
import { TripCoachCard } from "@/components/coach/TripCoachCard";

const TripMap = lazy(() => import("@/components/trips/TripMap"));

export const Route = createFileRoute("/_authenticated/viagens/$id")({
  head: () => ({
    meta: [
      { title: "Dashboard da viagem · Telemetrix" },
      {
        name: "description",
        content:
          "Dashboard completo da viagem: KPIs, comparativo com viagens similares, participação no mês e projeção financeira.",
      },
      { property: "og:title", content: "Dashboard da viagem · Telemetrix" },
      {
        property: "og:description",
        content: "KPIs, comparativos e projeção financeira do mês para cada viagem.",
      },
    ],
  }),
  component: TripDetailPage,
});

type TripDetail = {
  id: string;
  vehicle_id: string | null;
  start_time: string;
  end_time: string | null;

  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  distance_km: number | null;
  hardware_source: string | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  mileage_at_start: number | null;
  mileage_at_end: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
  eco_score: number | null;
  harsh_brake_count: number | null;
  harsh_accel_count: number | null;
  harsh_corner_count: number | null;
  overspeed_count: number | null;
  high_rpm_count: number | null;
  idle_seconds: number | null;
  wasted_fuel_liters: number | null;
  wasted_cost: number | null;
  eco_events: unknown;
  route_data: unknown;
};

type TripRow = Pick<
  TripDetail,
  "id" | "start_time" | "distance_km" | "fuel_liters" | "estimated_cost"
>;

function TripDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async (): Promise<TripDetail | null> => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id,start_time,end_time,start_lat,start_lng,end_lat,end_lng,distance_km,hardware_source,avg_speed_kmh,max_speed_kmh,mileage_at_start,mileage_at_end,fuel_liters,estimated_cost,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count,idle_seconds,wasted_fuel_liters,wasted_cost,eco_events,route_data",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as TripDetail | null;
    },
  });

  const { data: allTrips } = useQuery({
    queryKey: ["trips-list"],
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,distance_km,fuel_liters,estimated_cost")
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });

  const routeTrail = useMemo(() => {
    const parsed = parseRouteData(trip?.route_data);
    if (!parsed) return undefined;
    return parsed.points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      accel: p.accel,
      t: p.t,
    }));
  }, [trip?.route_data]);

  const ecoEvents = useMemo(() => (trip ? parseEcoEvents(trip.eco_events) : []), [trip]);

  const tripCost = trip
    ? estimateTripCost({
        estimatedCost: trip.estimated_cost,
        fuelLiters: trip.fuel_liters,
      })
    : null;

  const analysis = useMemo(() => {
    if (!trip || !allTrips) return null;

    const currentTripCost = estimateTripCost({
      estimatedCost: trip.estimated_cost,
      fuelLiters: trip.fuel_liters,
    });

    const kmpl =
      trip.distance_km && trip.fuel_liters && trip.fuel_liters > 0
        ? trip.distance_km / trip.fuel_liters
        : null;

    // Similares (±20% distância), excluindo a atual
    const km = trip.distance_km ?? 0;
    const lo = km * 0.8;
    const hi = km * 1.2;
    const similar = allTrips.filter(
      (t) =>
        t.id !== trip.id &&
        (t.distance_km ?? 0) >= lo &&
        (t.distance_km ?? 0) <= hi &&
        (t.fuel_liters ?? 0) > 0,
    );
    const simKmpl = similar
      .map((t) => {
        if (t.distance_km == null || t.fuel_liters == null || t.fuel_liters <= 0) {
          return null;
        }
        return t.distance_km / t.fuel_liters;
      })
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    const simCost = similar
      .map((t) =>
        estimateTripCost({
          estimatedCost: t.estimated_cost,
          fuelLiters: t.fuel_liters,
        }),
      )
      .filter((v): v is number => v != null);
    const avgKmpl = simKmpl.length > 0 ? simKmpl.reduce((s, v) => s + v, 0) / simKmpl.length : null;
    const avgCost = simCost.length > 0 ? simCost.reduce((s, v) => s + v, 0) / simCost.length : null;

    const kmplDiffPct = kmpl != null && avgKmpl != null ? ((kmpl - avgKmpl) / avgKmpl) * 100 : null;
    const costDiffPct =
      currentTripCost != null && avgCost != null && avgCost > 0
        ? ((currentTripCost - avgCost) / avgCost) * 100
        : null;
    const better = kmplDiffPct != null && kmplDiffPct >= 5;

    // Mês da viagem
    const start = new Date(trip.start_time);
    const y = start.getFullYear();
    const m = start.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const firstOfNext = new Date(y, m + 1, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const monthTrips = allTrips.filter((t) => {
      const d = new Date(t.start_time);
      return d >= firstOfMonth && d < firstOfNext;
    });
    const monthKm = monthTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0);
    const monthCost = monthTrips.reduce(
      (s, t) =>
        s +
        (estimateTripCost({
          estimatedCost: t.estimated_cost,
          fuelLiters: t.fuel_liters,
        }) ?? 0),
      0,
    );
    const monthLiters = monthTrips.reduce((s, t) => s + (t.fuel_liters ?? 0), 0);

    const kmSharePct = monthKm > 0 ? ((trip.distance_km ?? 0) / monthKm) * 100 : 0;
    const costSharePct =
      monthCost > 0 && currentTripCost != null ? (currentTripCost / monthCost) * 100 : 0;

    // Projeção do mês (só faz sentido se o mês selecionado é o mês corrente)
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m;
    const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;
    const factor = dayOfMonth > 0 ? daysInMonth / dayOfMonth : 1;
    const projKm = monthKm * factor;
    const projCost = monthCost * factor;
    const projLiters = monthLiters * factor;

    return {
      kmpl,
      similarCount: similar.length,
      avgKmpl,
      avgCost,
      kmplDiffPct,
      costDiffPct,
      better,
      tripCost: currentTripCost,
      monthKm,
      monthCost,
      monthLiters,
      kmSharePct,
      costSharePct,
      isCurrentMonth,
      projKm,
      projCost,
      projLiters,
      daysInMonth,
      dayOfMonth,
      monthLabel: start.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [trip, allTrips]);

  const mapFallback = (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  );

  return (
    <AppShell title="Viagem" subtitle={trip ? formatDateTime(trip.start_time) : "Detalhe"}>
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/viagens"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>
        {trip && (
          <DeleteTripButton
            tripId={trip.id}
            variant="button"
            onDeleted={() => navigate({ to: "/viagens" })}
          />
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !trip ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Viagem não encontrada.</p>
      ) : (
        <>
          {analysis?.better && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <Leaf className="size-3.5" /> Viagem eficiente
            </div>
          )}

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
                  trail={routeTrail}
                  ecoEvents={ecoEvents}
                />
              </Suspense>
            </ClientOnly>
          </div>

          {/* Início x Fim */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="card-surface p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Início
              </div>
              <div className="text-sm font-medium tabular-nums">{formatTime(trip.start_time)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                Odômetro:{" "}
                {trip.mileage_at_start != null ? `${Math.round(trip.mileage_at_start)} km` : "—"}
              </div>
            </div>
            <div className="card-surface p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fim</div>
              <div className="text-sm font-medium tabular-nums">
                {trip.end_time ? formatTime(trip.end_time) : "—"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                Odômetro:{" "}
                {trip.mileage_at_end != null ? `${Math.round(trip.mileage_at_end)} km` : "—"}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Origem dos dados:{" "}
            {trip.hardware_source === "elm327"
              ? "Adaptador OBD-II (Bluetooth)"
              : "Equipamento dedicado (nuvem)"}
          </p>

          {/* KPIs */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat
              Icon={Clock}
              label="Duração"
              value={formatDurationBetween(trip.start_time, trip.end_time)}
            />
            <Stat
              Icon={RouteIcon}
              label="Distância"
              value={trip.distance_km != null ? `${formatDecimal(trip.distance_km)} km` : "—"}
            />
            <Stat
              Icon={Gauge}
              label="Vel. média"
              value={trip.avg_speed_kmh != null ? formatSpeed(Math.round(trip.avg_speed_kmh)) : "—"}
            />
            <Stat
              Icon={Gauge}
              label="Vel. máxima"
              value={trip.max_speed_kmh != null ? formatSpeed(Math.round(trip.max_speed_kmh)) : "—"}
            />
            <Stat
              Icon={Fuel}
              label="Consumo"
              value={
                analysis?.kmpl != null
                  ? `${formatDecimal(analysis.kmpl)} km/L`
                  : trip.fuel_liters != null
                    ? `${formatDecimal(trip.fuel_liters)} L`
                    : "—"
              }
            />
            <Stat
              Icon={Fuel}
              label="Custo estimado"
              value={tripCost != null ? formatBRL(tripCost) : "—"}
              highlight
            />
          </div>

          {/* Eco Score */}
          <SectionTitle>Pontuação de direção</SectionTitle>
          <EcoTripCard trip={trip} />
          {ecoEvents.length > 1 && (
            <div className="mt-3">
              <EcoEventsChart events={ecoEvents} />
            </div>
          )}

          {/* Coach de direção com IA */}
          <SectionTitle>Coach de direção (IA)</SectionTitle>
          <TripCoachCard tripId={trip.id} />

          {/* Comparativo com viagens similares */}
          <SectionTitle>Comparativo com viagens similares</SectionTitle>
          <div className="card-surface p-4">
            {!analysis || analysis.similarCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem viagens de distância similar ainda para comparar.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground">
                  Baseado em {analysis.similarCount} viagem(ns) com distância entre ±20% desta.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <CompareRow
                    label="Consumo (km/L)"
                    thisValue={analysis.kmpl != null ? `${formatDecimal(analysis.kmpl)}` : "—"}
                    avgValue={analysis.avgKmpl != null ? `${formatDecimal(analysis.avgKmpl)}` : "—"}
                    diffPct={analysis.kmplDiffPct}
                    higherIsBetter
                  />
                  <CompareRow
                    label="Custo"
                    thisValue={analysis.tripCost != null ? formatBRL(analysis.tripCost) : "—"}
                    avgValue={analysis.avgCost != null ? formatBRL(analysis.avgCost) : "—"}
                    diffPct={analysis.costDiffPct}
                    higherIsBetter={false}
                  />
                </div>
              </>
            )}
          </div>

          {/* Posição no mês */}
          {analysis && (
            <>
              <SectionTitle>
                Posição em <span className="capitalize">{analysis.monthLabel}</span>
              </SectionTitle>
              <div className="space-y-3 card-surface p-4">
                <ShareBar
                  label="Distância do mês"
                  pct={analysis.kmSharePct}
                  right={`${formatDecimal(trip.distance_km ?? 0)} / ${formatDecimal(analysis.monthKm)} km`}
                />
                <ShareBar
                  label="Custo do mês"
                  pct={analysis.costSharePct}
                  right={`${formatBRL(analysis.tripCost ?? 0)} / ${formatBRL(analysis.monthCost)}`}
                  accent="emerald"
                />
              </div>
            </>
          )}

          {/* Projeção do mês */}
          {analysis && (
            <>
              <SectionTitle>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange className="size-3.5" />
                  Projeção do mês
                </span>
              </SectionTitle>
              <div className="card-surface p-4">
                {!analysis.isCurrentMonth ? (
                  <p className="text-sm text-muted-foreground">
                    Mês encerrado — totais consolidados:{" "}
                    <span className="tabular-nums text-foreground">
                      {formatDecimal(analysis.monthKm)} km · {formatBRL(analysis.monthCost)}
                    </span>
                    .
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      Ritmo até hoje (dia {analysis.dayOfMonth} de {analysis.daysInMonth}) projetado
                      para o mês inteiro.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <MiniStat label="Km" value={`${formatDecimal(analysis.projKm)}`} />
                      <MiniStat label="Litros" value={`${formatDecimal(analysis.projLiters)} L`} />
                      <MiniStat label="Custo" value={formatBRL(analysis.projCost)} highlight />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="mt-6">
            <Link
              to="/viagens"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todas as viagens do mês →
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
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
    <div className="card-surface p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${highlight ? "text-success" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  thisValue,
  avgValue,
  diffPct,
  higherIsBetter,
}: {
  label: string;
  thisValue: string;
  avgValue: string;
  diffPct: number | null;
  higherIsBetter: boolean;
}) {
  const good = diffPct == null ? null : higherIsBetter ? diffPct >= 0 : diffPct <= 0;
  const color = good === null ? "text-muted-foreground" : good ? "text-success" : "text-rose-500";
  const Icon = good === null ? null : good ? TrendingUp : TrendingDown;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{thisValue}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">média: {avgValue}</div>
      {diffPct != null && (
        <div
          className={`mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums ${color}`}
        >
          {Icon && <Icon className="size-3" />}
          {diffPct > 0 ? "+" : ""}
          {diffPct.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function ShareBar({
  label,
  pct,
  right,
  accent = "primary",
}: {
  label: string;
  pct: number;
  right: string;
  accent?: "primary" | "emerald";
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor = accent === "emerald" ? "bg-success" : "bg-primary";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{right}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-0.5 text-right text-[10px] text-muted-foreground tabular-nums">
        {clamped.toFixed(1)}%
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${highlight ? "text-success" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
