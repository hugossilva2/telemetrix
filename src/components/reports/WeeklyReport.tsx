import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Minus,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatKm } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/expenses/categories";
import { estimateTripCost } from "@/lib/trips/cost";
import {
  nextWeek,
  previousWeek,
  weekKey,
  weekLabel,
  weekRange,
} from "@/lib/reports/week";
import {
  CHECKUP_LABEL,
  checkupClasses,
  summarizeCheckups,
  type CheckupRecord,
} from "@/lib/checkups/rules";

interface WeekTrip {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
  eco_events: unknown;
}

interface WeekFuel {
  id: string;
  date: string;
  liters_filled: number;
  total_cost: number;
}

function rpmFromEvents(events: unknown): number[] {
  if (!Array.isArray(events)) return [];
  const out: number[] = [];
  for (const e of events as { type?: string; value?: number }[]) {
    if (e?.type === "high_rpm" && typeof e.value === "number" && Number.isFinite(e.value)) {
      out.push(e.value);
    }
  }
  return out;
}

function useWeekData(key: string) {
  const { start, end } = weekRange(key);
  return useQuery({
    queryKey: ["report-week", key],
    queryFn: async () => {
      const startTs = `${start}T00:00:00.000`;
      const endTs = `${end}T23:59:59.999`;
      const [trips, fuel, checkups] = await Promise.all([
        supabase
          .from("trips")
          .select(
            "id,start_time,end_time,distance_km,avg_speed_kmh,max_speed_kmh,fuel_liters,estimated_cost,eco_events",
          )
          .gte("start_time", startTs)
          .lte("start_time", endTs),
        supabase
          .from("fuel_logs")
          .select("id,date,liters_filled,total_cost")
          .gte("date", startTs)
          .lte("date", endTs),
        supabase
          .from("vehicle_checkups")
          .select("id,item,checked_at,mileage_km,notes")
          .gte("checked_at", startTs)
          .lte("checked_at", endTs),
      ]);
      const err = trips.error || fuel.error || checkups.error;
      if (err) throw err;
      return {
        trips: (trips.data ?? []) as WeekTrip[],
        fuel: (fuel.data ?? []) as WeekFuel[],
        checkups: (checkups.data ?? []) as CheckupRecord[],
      };
    },
  });
}

function aggregate(d?: { trips: WeekTrip[]; fuel: WeekFuel[] }) {
  const trips = d?.trips ?? [];
  const km = trips.reduce((s, t) => s + Number(t.distance_km || 0), 0);

  const speedTrips = trips.filter((t) => Number(t.avg_speed_kmh) > 0);
  const avgSpeed =
    speedTrips.length > 0
      ? speedTrips.reduce((s, t) => s + Number(t.avg_speed_kmh || 0), 0) / speedTrips.length
      : null;
  const maxSpeed = trips.reduce((m, t) => Math.max(m, Number(t.max_speed_kmh || 0)), 0);

  const rpms = trips.flatMap((t) => rpmFromEvents(t.eco_events));
  const avgRpm = rpms.length > 0 ? rpms.reduce((s, v) => s + v, 0) / rpms.length : null;
  const maxRpm = rpms.length > 0 ? Math.max(...rpms) : null;

  const litersUsed = trips.reduce((s, t) => s + Number(t.fuel_liters || 0), 0);
  const tripCost = trips.reduce(
    (s, t) =>
      s +
      (estimateTripCost({ estimatedCost: t.estimated_cost, fuelLiters: t.fuel_liters }) ?? 0),
    0,
  );

  const refuelCost = (d?.fuel ?? []).reduce((s, r) => s + Number(r.total_cost || 0), 0);
  const refuelLiters = (d?.fuel ?? []).reduce((s, r) => s + Number(r.liters_filled || 0), 0);

  const days = new Set(trips.map((t) => t.start_time.slice(0, 10))).size;

  return {
    trips: trips.length,
    km,
    kmPerDay: days > 0 ? km / days : null,
    kmPerTrip: trips.length > 0 ? km / trips.length : null,
    avgSpeed,
    maxSpeed: maxSpeed > 0 ? maxSpeed : null,
    avgRpm,
    maxRpm,
    litersUsed,
    tripCost,
    refuelCost,
    refuelLiters,
    costPerKm: km > 0 && tripCost > 0 ? tripCost / km : null,
    activeDays: days,
  };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function WeeklyReport() {
  const [week, setWeek] = useState(() => weekKey(new Date()));
  const prevKey = previousWeek(week);
  const current = useWeekData(week);
  const previous = useWeekData(prevKey);

  const a = aggregate(current.data);
  const b = aggregate(previous.data);

  const isCurrentWeek = week === weekKey(new Date());
  const delta = b.km > 0 ? ((a.km - b.km) / b.km) * 100 : null;

  const { data: allCheckups = [] } = useQuery<CheckupRecord[]>({
    queryKey: ["checkups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_checkups")
        .select("id,item,checked_at,mileage_km,notes")
        .order("checked_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as CheckupRecord[];
    },
  });

  const routines = useMemo(() => summarizeCheckups(allCheckups), [allCheckups]);
  const pendingRoutines = routines.filter((r) => r.info.status !== "ok");
  const doneThisWeek = current.data?.checkups ?? [];

  const exportCsv = () => {
    const rows: (string | number)[][] = [["Métrica", "Semana atual", "Semana anterior"]];
    const row = (l: string, x: string, y: string) => rows.push([l, x, y]);
    row("Período", weekLabel(week), weekLabel(prevKey));
    row("Viagens", String(a.trips), String(b.trips));
    row("Distância (km)", nf1.format(a.km), nf1.format(b.km));
    row(
      "Média por dia (km)",
      a.kmPerDay != null ? nf1.format(a.kmPerDay) : "—",
      b.kmPerDay != null ? nf1.format(b.kmPerDay) : "—",
    );
    row(
      "Velocidade média (km/h)",
      a.avgSpeed != null ? nf1.format(a.avgSpeed) : "—",
      b.avgSpeed != null ? nf1.format(b.avgSpeed) : "—",
    );
    row(
      "Velocidade máxima (km/h)",
      a.maxSpeed != null ? nf0.format(a.maxSpeed) : "—",
      b.maxSpeed != null ? nf0.format(b.maxSpeed) : "—",
    );
    row(
      "RPM médio",
      a.avgRpm != null ? nf0.format(a.avgRpm) : "—",
      b.avgRpm != null ? nf0.format(b.avgRpm) : "—",
    );
    row(
      "RPM máximo",
      a.maxRpm != null ? nf0.format(a.maxRpm) : "—",
      b.maxRpm != null ? nf0.format(b.maxRpm) : "—",
    );
    row("Combustível consumido (L)", nf1.format(a.litersUsed), nf1.format(b.litersUsed));
    row(
      "Gasto estimado (R$)",
      a.tripCost.toFixed(2).replace(".", ","),
      b.tripCost.toFixed(2).replace(".", ","),
    );
    row(
      "Abastecido (R$)",
      a.refuelCost.toFixed(2).replace(".", ","),
      b.refuelCost.toFixed(2).replace(".", ","),
    );
    rows.push([]);
    rows.push(["Rotinas conferidas na semana"]);
    for (const c of doneThisWeek) {
      rows.push([
        CHECKUP_LABEL[c.item] ?? c.item,
        new Date(c.checked_at).toLocaleString("pt-BR"),
        c.notes ?? "",
      ]);
    }
    rows.push([]);
    rows.push(["Rotinas pendentes"]);
    for (const p of pendingRoutines) rows.push([p.def.label, p.info.message]);
    downloadCsv(`telemetrix-semana-${week}.csv`, toCsv(rows));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          onClick={() => setWeek(previousWeek(week))}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="card-surface flex-1 px-3 py-2 text-center">
          <p className="text-[11px] text-muted-foreground">
            {isCurrentWeek ? "Semana atual" : "Semana"}
          </p>
          <p className="text-sm font-semibold">{weekLabel(week)}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          disabled={isCurrentWeek}
          onClick={() => setWeek(nextWeek(week))}
          aria-label="Próxima semana"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={exportCsv} aria-label="Exportar CSV">
          <Download className="size-4" />
        </Button>
      </div>

      <div className="mt-3 card-surface p-4">
        <p className="text-xs text-muted-foreground">Distância na semana</p>
        <p className="mt-1 font-mono text-3xl font-semibold">{formatKm(a.km)}</p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {delta == null ? (
            <span className="text-muted-foreground">Sem comparativo da semana anterior</span>
          ) : (
            <>
              {delta > 0 ? (
                <ArrowUpRight className="size-3.5 text-primary" />
              ) : delta < 0 ? (
                <ArrowDownRight className="size-3.5 text-warning" />
              ) : (
                <Minus className="size-3.5 text-muted-foreground" />
              )}
              <span className={delta >= 0 ? "text-primary" : "text-warning"}>
                {Math.abs(delta).toFixed(0)}%
              </span>
              <span className="text-muted-foreground">
                vs. {weekLabel(prevKey)} ({formatKm(b.km)})
              </span>
            </>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {a.trips} viagem(ns) em {a.activeDays} dia(s) com uso
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat
          label="Média por dia"
          value={a.kmPerDay != null ? `${nf1.format(a.kmPerDay)} km` : "—"}
          hint={a.kmPerTrip != null ? `${nf1.format(a.kmPerTrip)} km por viagem` : undefined}
        />
        <Stat
          label="Velocidade média"
          value={a.avgSpeed != null ? `${nf1.format(a.avgSpeed)} km/h` : "—"}
          hint={a.maxSpeed != null ? `máx. ${nf0.format(a.maxSpeed)} km/h` : undefined}
        />
        <Stat
          label="RPM médio"
          value={a.avgRpm != null ? nf0.format(a.avgRpm) : "—"}
          hint={a.maxRpm != null ? `máx. ${nf0.format(a.maxRpm)}` : "sem leitura de RPM"}
        />
        <Stat
          label="Combustível"
          value={a.litersUsed > 0 ? `${nf1.format(a.litersUsed)} L` : "—"}
          hint={a.refuelLiters > 0 ? `${nf1.format(a.refuelLiters)} L abastecidos` : undefined}
        />
        <Stat
          label="Gasto estimado"
          value={a.tripCost > 0 ? formatBRL(a.tripCost) : "—"}
          hint={a.costPerKm != null ? `${formatBRL(a.costPerKm)} por km` : undefined}
        />
        <Stat
          label="Abastecimentos"
          value={a.refuelCost > 0 ? formatBRL(a.refuelCost) : "—"}
          hint={`${current.data?.fuel.length ?? 0} lançamento(s)`}
        />
      </div>

      <div className="mt-3 card-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Rotinas de conferência</h2>
          </div>
          <Link to="/rotinas" className="text-xs font-medium text-primary">
            Abrir
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {doneThisWeek.length === 0
            ? "Nenhuma rotina conferida nesta semana."
            : `${doneThisWeek.length} conferência(s) registrada(s) nesta semana.`}
        </p>
        {pendingRoutines.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {pendingRoutines.map(({ def, info }) => (
              <li key={def.value} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs">{def.label}</span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${checkupClasses[info.status]}`}
                >
                  {info.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
