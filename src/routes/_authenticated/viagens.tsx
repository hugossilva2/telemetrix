import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, DownloadCloud, Leaf, Loader2, Route as RouteIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { backfillTripsFromFlespi } from "@/lib/trips/backfill.functions";
import { formatBRL, formatDecimal } from "@/lib/format";
import { estimateTripCost } from "@/lib/trips/cost";
import { formatDateTime, formatDurationBetween } from "@/lib/trips/format";


export const Route = createFileRoute("/_authenticated/viagens")({
  head: () => ({
    meta: [
      { title: "Viagens · Telemetrix" },
      { name: "description", content: "Histórico de viagens com relatório mensal, filtro e comparativo de eficiência." },
      { property: "og:title", content: "Viagens · Telemetrix" },
      { property: "og:description", content: "Relatório mensal e comparativo de eficiência entre viagens." },
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

function getTripStartMs(t: TripRow) {
  return new Date(t.start_time).getTime();
}

function getTripEndMs(t: TripRow) {
  if (!t.end_time) return getTripStartMs(t);
  return new Date(t.end_time).getTime();
}

function tripScore(t: TripRow) {
  const durationS = Math.max(0, (getTripEndMs(t) - getTripStartMs(t)) / 1000);
  return (t.distance_km ?? 0) * 10_000 + durationS;
}

function removeOverlappingFragments(rows: TripRow[]) {
  const selected: TripRow[] = [];
  const byBestSignal = [...rows].sort((a, b) => tripScore(b) - tripScore(a));

  for (const trip of byBestSignal) {
    const start = getTripStartMs(trip);
    const end = getTripEndMs(trip);
    const overlapsExisting = selected.some((kept) => {
      const keptStart = getTripStartMs(kept);
      const keptEnd = getTripEndMs(kept);
      return start <= keptEnd && end >= keptStart;
    });

    if (!overlapsExisting) selected.push(trip);
  }

  return selected.sort((a, b) => getTripStartMs(b) - getTripStartMs(a));
}

const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

function ViagensPage() {
  const showingTripDetail = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/_authenticated/viagens/$id"),
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips-list"],
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,end_time,distance_km,avg_speed_kmh,fuel_liters,estimated_cost")
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });

  const visibleTrips = useMemo(
    () => removeOverlappingFragments(trips ?? []),
    [trips],
  );

  // Mês selecionado: chave "YYYY-MM"
  const [monthKey, setMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Meses disponíveis (com viagens)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of visibleTrips) {
      const d = new Date(t.start_time);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    // sempre inclui o mês atual para permitir navegação
    set.add(monthKey);
    return Array.from(set).sort().reverse();
  }, [visibleTrips, monthKey]);

  const currentIdx = availableMonths.indexOf(monthKey);
  const canPrev = currentIdx < availableMonths.length - 1;
  const canNext = currentIdx > 0;

  const monthDate = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [monthKey]);

  // Viagens do mês
  const monthTrips = useMemo(() => {
    return visibleTrips.filter((t) => {
      const d = new Date(t.start_time);
      return (
        d.getFullYear() === monthDate.getFullYear() &&
        d.getMonth() === monthDate.getMonth()
      );
    });
  }, [visibleTrips, monthDate]);

  // Totais do mês
  const totals = useMemo(() => {
    let km = 0;
    let cost = 0;
    let liters = 0;
    for (const t of monthTrips) {
      km += t.distance_km ?? 0;
      cost += estimateTripCost({
        estimatedCost: t.estimated_cost,
        fuelLiters: t.fuel_liters,
      }) ?? 0;
      liters += t.fuel_liters ?? 0;
    }
    const kmpl = liters > 0 ? km / liters : null;
    return { km, cost, liters, kmpl, count: monthTrips.length };
  }, [monthTrips]);

  // Eficiência (km/L) por viagem + comparação com viagens de distância similar (±20%)
  const efficiencyById = useMemo(() => {
    const all = visibleTrips;
    const withEff = all
      .map((t) => {
        const km = t.distance_km ?? 0;
        const l = t.fuel_liters ?? 0;
        return { id: t.id, km, kmpl: l > 0 && km > 0 ? km / l : null };
      })
      .filter((x) => x.kmpl != null && x.km > 0) as { id: string; km: number; kmpl: number }[];

    const map = new Map<string, { kmpl: number; better: boolean; sampleSize: number }>();
    for (const t of withEff) {
      const lo = t.km * 0.8;
      const hi = t.km * 1.2;
      const peers = withEff.filter((p) => p.id !== t.id && p.km >= lo && p.km <= hi);
      if (peers.length === 0) {
        map.set(t.id, { kmpl: t.kmpl, better: false, sampleSize: 0 });
        continue;
      }
      const avg = peers.reduce((s, p) => s + p.kmpl, 0) / peers.length;
      // "melhor" = pelo menos 5% acima da média das similares
      map.set(t.id, { kmpl: t.kmpl, better: t.kmpl >= avg * 1.05, sampleSize: peers.length });
    }
    return map;
  }, [visibleTrips]);

  if (showingTripDetail) {
    return <Outlet />;
  }

  return (
    <AppShell title="Viagens" subtitle="Relatório mensal">
      {/* Seletor de mês */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-card px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            if (canPrev) setMonthKey(availableMonths[currentIdx + 1]);
          }}
          disabled={!canPrev}
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-medium capitalize">{monthLabel(monthDate)}</div>
        <button
          type="button"
          onClick={() => {
            if (canNext) setMonthKey(availableMonths[currentIdx - 1]);
          }}
          disabled={!canNext}
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Totais do mês */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Kpi label="Viagens" value={String(totals.count)} />
        <Kpi label="Distância" value={`${formatDecimal(totals.km)} km`} />
        <Kpi label="Custo" value={formatBRL(totals.cost)} highlight />
        <Kpi
          label="Consumo médio"
          value={totals.kmpl != null ? `${formatDecimal(totals.kmpl)} km/L` : "—"}
        />
      </div>

      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={backfill.isPending}
          onClick={() => backfill.mutate()}
        >
          {backfill.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DownloadCloud className="size-4" />
          )}
          Importar histórico do rastreador
        </Button>
      </div>



      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : monthTrips.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <RouteIcon className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium">Sem viagens neste mês</p>
            <p className="text-xs text-muted-foreground">
              Navegue entre os meses ou aguarde novos registros.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {monthTrips.map((t) => {
            const eff = efficiencyById.get(t.id);
            const tripCost = estimateTripCost({
              estimatedCost: t.estimated_cost,
              fuelLiters: t.fuel_liters,
            });
            return (
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
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                      <span>{formatDecimal(t.distance_km ?? undefined)} km</span>
                      {t.avg_speed_kmh != null && (
                        <span>{Math.round(t.avg_speed_kmh)} km/h méd.</span>
                      )}
                      {eff?.kmpl != null && (
                        <span>{formatDecimal(eff.kmpl)} km/L</span>
                      )}
                      {tripCost != null && (
                        <span className="text-foreground">{formatBRL(tripCost)}</span>
                      )}
                      {eff?.better && eff.sampleSize > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500"
                          title={`Consumo melhor que a média em ${eff.sampleSize} viagem(ns) de distância similar`}
                        >
                          <Leaf className="size-3" /> eficiente
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          highlight ? "text-emerald-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
