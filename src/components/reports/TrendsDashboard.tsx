import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEcoSettings } from "@/lib/eco/settings";
import { expectedKmpl, fuelLabel } from "@/lib/vehicles/specs";
import { lastWeeks, weekKey, weekLabel } from "@/lib/reports/week";

interface TrendTrip {
  id: string;
  start_time: string;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  fuel_liters: number | null;
  eco_score: number | null;
  idle_seconds: number | null;
}

export interface WeekPoint {
  key: string;
  label: string;
  trips: number;
  km: number;
  liters: number;
  score: number | null;
  kmpl: number | null;
  target: number | null;
  efficiency: number | null;
  idleMin: number;
}

const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function buildWeeks(trips: TrendTrip[], weeks: string[], fuel: ReturnType<typeof getEcoSettings>["fuel"]): WeekPoint[] {
  const byWeek = new Map<string, TrendTrip[]>();
  for (const k of weeks) byWeek.set(k, []);
  for (const t of trips) {
    const k = weekKey(t.start_time);
    const bucket = byWeek.get(k);
    if (bucket) bucket.push(t);
  }
  return weeks.map((k) => {
    const rows = byWeek.get(k) ?? [];
    const km = rows.reduce((s, t) => s + Number(t.distance_km || 0), 0);
    const liters = rows.reduce((s, t) => s + Number(t.fuel_liters || 0), 0);
    const scored = rows.filter((t) => t.eco_score != null);
    const score =
      scored.length > 0
        ? scored.reduce((s, t) => s + Number(t.eco_score), 0) / scored.length
        : null;
    const withSpeed = rows.filter((t) => Number(t.avg_speed_kmh) > 0 && Number(t.distance_km) > 0);
    const totalKmSpeed = withSpeed.reduce((s, t) => s + Number(t.distance_km), 0);
    const avgSpeed =
      totalKmSpeed > 0
        ? withSpeed.reduce((s, t) => s + Number(t.avg_speed_kmh) * Number(t.distance_km), 0) /
          totalKmSpeed
        : null;
    const kmpl = liters > 0.05 && km > 0 ? km / liters : null;
    const target = km > 0 ? expectedKmpl({ fuel, avgSpeedKmh: avgSpeed }) : null;
    return {
      key: k,
      label: weekLabel(k),
      trips: rows.length,
      km,
      liters,
      score,
      kmpl,
      target,
      efficiency: kmpl != null && target ? (kmpl / target) * 100 : null,
      idleMin: rows.reduce((s, t) => s + Number(t.idle_seconds || 0), 0) / 60,
    };
  });
}

function Delta({ value, unit, invert }: { value: number | null; unit: string; invert?: boolean }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-[11px] text-muted-foreground">sem comparativo</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const cls =
    value === 0 ? "text-muted-foreground" : good ? "text-success" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="size-3" />
      {value > 0 ? "+" : ""}
      {nf1.format(value)}
      {unit} vs. semana anterior
    </span>
  );
}

function Kpi({
  label,
  value,
  delta,
  unit,
  invert,
}: {
  label: string;
  value: string;
  delta: number | null;
  unit: string;
  invert?: boolean;
}) {
  return (
    <div className="card-surface p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{value}</p>
      <Delta value={delta} unit={unit} invert={invert} />
    </div>
  );
}

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; color?: string }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums text-muted-foreground" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? nf1.format(p.value) : "—"}
          {suffix ?? ""}
        </p>
      ))}
    </div>
  );
}

export function TrendsDashboard() {
  const [range, setRange] = useState<"8" | "12" | "26">("12");
  const fuel = useMemo(() => getEcoSettings().fuel, []);
  const weeks = useMemo(() => lastWeeks(Number(range)).reverse(), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["trends-trips", range],
    queryFn: async (): Promise<TrendTrip[]> => {
      const since = `${weeks[0]}T00:00:00.000`;
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,distance_km,avg_speed_kmh,fuel_liters,eco_score,idle_seconds")
        .gte("start_time", since)
        .order("start_time", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as TrendTrip[];
    },
  });

  const points = useMemo(() => buildWeeks(data ?? [], weeks, fuel), [data, weeks, fuel]);
  const active = points.filter((p) => p.trips > 0);
  const cur = active[active.length - 1];
  const prev = active[active.length - 2];

  const diff = (a?: number | null, b?: number | null) =>
    a != null && b != null && Number.isFinite(a) && Number.isFinite(b) ? a - b : null;

  const avgTarget =
    active.length > 0
      ? active.reduce((s, p) => s + (p.target ?? 0), 0) /
        Math.max(1, active.filter((p) => p.target != null).length)
      : null;

  return (
    <div className="space-y-3">
      <Tabs value={range} onValueChange={(v) => setRange(v as "8" | "12" | "26")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="8">8 semanas</TabsTrigger>
          <TabsTrigger value="12">12 semanas</TabsTrigger>
          <TabsTrigger value="26">26 semanas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : active.length === 0 ? (
        <div className="card-surface p-4 text-sm text-muted-foreground">
          Ainda não há viagens registradas nesse período. Os gráficos aparecem
          automaticamente na primeira viagem com o motor ligado.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label="Pontos (Eco Score)"
              value={cur?.score != null ? nf1.format(cur.score) : "—"}
              delta={diff(cur?.score, prev?.score)}
              unit=" pts"
            />
            <Kpi
              label="Consumo"
              value={cur?.kmpl != null ? `${nf1.format(cur.kmpl)} km/L` : "—"}
              delta={diff(cur?.kmpl, prev?.kmpl)}
              unit=" km/L"
            />
            <Kpi
              label="Eficiência vs. Inmetro"
              value={cur?.efficiency != null ? `${nf1.format(cur.efficiency)}%` : "—"}
              delta={diff(cur?.efficiency, prev?.efficiency)}
              unit="%"
            />
            <Kpi
              label="Marcha lenta"
              value={`${nf1.format(cur?.idleMin ?? 0)} min`}
              delta={diff(cur?.idleMin, prev?.idleMin)}
              unit=" min"
              invert
            />
          </div>

          <section className="card-surface p-3">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evolução dos pontos
              </h3>
              <span className="text-[10px] text-muted-foreground">meta 90 pts</span>
            </header>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} {...axis} />
                  <ReferenceLine y={90} stroke="var(--success)" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip suffix=" pts" />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Eco Score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--primary)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-surface p-3">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consumo por semana (km/L)
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {fuelLabel(fuel)}
                {avgTarget ? ` · meta ${nf1.format(avgTarget)}` : ""}
              </span>
            </header>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                  <YAxis {...axis} />
                  {avgTarget ? (
                    <ReferenceLine y={avgTarget} stroke="var(--warning)" strokeDasharray="4 4" />
                  ) : null}
                  <Tooltip content={<ChartTooltip suffix=" km/L" />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="kmpl" name="km/L" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-surface p-3">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eficiência vs. meta Inmetro
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <TrendingUp className="size-3" /> 100% = meta
              </span>
            </header>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="effFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                  <YAxis {...axis} />
                  <ReferenceLine y={100} stroke="var(--success)" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip suffix="%" />} />
                  <Area
                    type="monotone"
                    dataKey="efficiency"
                    name="Eficiência"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#effFill)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-surface overflow-hidden">
            <h3 className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Detalhe por semana
            </h3>
            <div className="divide-y divide-border">
              {[...active].reverse().map((p) => (
                <div key={p.key} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {p.trips} viagem(ns) · {nf1.format(p.km)} km
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-mono font-semibold">
                      {p.score != null ? `${nf1.format(p.score)} pts` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.kmpl != null ? `${nf1.format(p.kmpl)} km/L` : "—"}
                      {p.efficiency != null ? ` · ${nf1.format(p.efficiency)}%` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
