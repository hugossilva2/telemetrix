import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownRight, ArrowUpRight, Download, Fuel, Minus, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyReport } from "@/components/reports/WeeklyReport";
import { TrendsDashboard } from "@/components/reports/TrendsDashboard";

type ReportView = "mensal" | "semanal" | "evolucao";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatKm } from "@/lib/format";
import { formatDate } from "@/lib/docs/expiry";
import { MAINTENANCE_LABEL } from "@/lib/maintenance/rules";
import {
  EXPENSE_COLOR,
  EXPENSE_LABEL,
  downloadCsv,
  monthKey,
  monthLabel,
  monthRange,
  previousMonth,
  toCsv,
  type ExpenseCategory,
} from "@/lib/expenses/categories";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório mensal · Telemetrix" },
      {
        name: "description",
        content: "Combustível, manutenção e despesas do mês, custo por km e exportação em CSV.",
      },
      { property: "og:title", content: "Relatório mensal · Telemetrix" },
      { property: "og:description", content: "Custo total do veículo por mês e por quilômetro." },
    ],
  }),
  component: RelatorioPage,
});

interface FuelRow {
  id: string;
  date: string;
  liters_filled: number;
  total_cost: number;
  price_per_liter: number;
}
interface MaintRow {
  id: string;
  type: string;
  title: string | null;
  service_date: string;
  cost: number | null;
  workshop: string | null;
}
interface ExpRow {
  id: string;
  category: ExpenseCategory;
  title: string | null;
  expense_date: string;
  amount: number;
  place: string | null;
}
interface TripRow {
  id: string;
  start_time: string;
  distance_km: number | null;
}

function useMonthData(key: string) {
  const { start, end } = monthRange(key);
  return useQuery({
    queryKey: ["report", key],
    queryFn: async () => {
      const startTs = `${start}T00:00:00.000Z`;
      const endTs = `${end}T23:59:59.999Z`;
      const [fuel, maint, exp, trips] = await Promise.all([
        supabase
          .from("fuel_logs")
          .select("id,date,liters_filled,total_cost,price_per_liter")
          .gte("date", startTs)
          .lte("date", endTs),
        supabase
          .from("maintenance_records")
          .select("id,type,title,service_date,cost,workshop")
          .gte("service_date", start)
          .lte("service_date", end),
        supabase
          .from("expenses")
          .select("id,category,title,expense_date,amount,place")
          .gte("expense_date", start)
          .lte("expense_date", end),
        supabase
          .from("trips")
          .select("id,start_time,distance_km")
          .gte("start_time", startTs)
          .lte("start_time", endTs),
      ]);
      const err = fuel.error || maint.error || exp.error || trips.error;
      if (err) throw err;
      return {
        fuel: (fuel.data ?? []) as FuelRow[],
        maintenance: (maint.data ?? []) as MaintRow[],
        expenses: (exp.data ?? []) as ExpRow[],
        trips: (trips.data ?? []) as TripRow[],
      };
    },
  });
}

function totalsOf(d?: {
  fuel: FuelRow[];
  maintenance: MaintRow[];
  expenses: ExpRow[];
  trips: TripRow[];
}) {
  const fuel = (d?.fuel ?? []).reduce((s, r) => s + Number(r.total_cost || 0), 0);
  const liters = (d?.fuel ?? []).reduce((s, r) => s + Number(r.liters_filled || 0), 0);
  const maintenance = (d?.maintenance ?? []).reduce((s, r) => s + Number(r.cost || 0), 0);
  const expenses = (d?.expenses ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const km = (d?.trips ?? []).reduce((s, r) => s + Number(r.distance_km || 0), 0);
  const total = fuel + maintenance + expenses;
  return { fuel, liters, maintenance, expenses, km, total, perKm: km > 0 ? total / km : null };
}

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
}

function RelatorioPage() {
  const [view, setView] = useState<ReportView>("evolucao");
  const options = useMemo(() => lastMonths(12), []);
  const [month, setMonth] = useState(options[0]);
  const prev = previousMonth(month);


  const current = useMonthData(month);
  const previous = useMonthData(prev);

  const t = totalsOf(current.data);
  const tPrev = totalsOf(previous.data);

  const delta = tPrev.total > 0 ? ((t.total - tPrev.total) / tPrev.total) * 100 : null;

  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    if (t.fuel > 0) map.set("fuel", { name: "Combustível", value: t.fuel, color: "var(--primary)" });
    if (t.maintenance > 0)
      map.set("maint", { name: "Manutenção", value: t.maintenance, color: "var(--chart-5)" });
    for (const e of current.data?.expenses ?? []) {
      const k = `cat-${e.category}`;
      const existing = map.get(k);
      map.set(k, {
        name: EXPENSE_LABEL[e.category],
        value: (existing?.value ?? 0) + Number(e.amount || 0),
        color: EXPENSE_COLOR[e.category],
      });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [current.data, t.fuel, t.maintenance]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"]];
    for (const f of current.data?.fuel ?? [])
      rows.push([
        formatDate(f.date),
        "Combustível",
        "Abastecimento",
        `${Number(f.liters_filled).toFixed(2)} L a ${Number(f.price_per_liter).toFixed(3)}/L`,
        Number(f.total_cost).toFixed(2).replace(".", ","),
      ]);
    for (const m of current.data?.maintenance ?? [])
      rows.push([
        formatDate(m.service_date),
        "Manutenção",
        MAINTENANCE_LABEL[m.type as keyof typeof MAINTENANCE_LABEL] ?? m.type,
        m.title ?? m.workshop ?? "",
        Number(m.cost ?? 0)
          .toFixed(2)
          .replace(".", ","),
      ]);
    for (const e of current.data?.expenses ?? [])
      rows.push([
        formatDate(e.expense_date),
        "Despesa",
        EXPENSE_LABEL[e.category],
        e.title ?? e.place ?? "",
        Number(e.amount).toFixed(2).replace(".", ","),
      ]);
    rows.push([]);
    rows.push(["Total", "", "", "", t.total.toFixed(2).replace(".", ",")]);
    rows.push(["Km rodados", "", "", "", t.km.toFixed(1).replace(".", ",")]);
    rows.push([
      "Custo por km",
      "",
      "",
      "",
      t.perKm != null ? t.perKm.toFixed(2).replace(".", ",") : "—",
    ]);
    downloadCsv(`telemetrix-${month}.csv`, toCsv(rows));
  };

  const loading = current.isLoading;

  return (
    <AppShell
      title="Relatório"
      subtitle={
        view === "mensal"
          ? "Custo consolidado do veículo"
          : view === "semanal"
            ? "Desempenho da semana"
            : "Evolução semana a semana"
      }
    >
      <Tabs value={view} onValueChange={(v) => setView(v as ReportView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "evolucao" ? (
        <div className="mt-3">
          <TrendsDashboard />
        </div>
      ) : view === "semanal" ? (
        <div className="mt-3">
          <WeeklyReport />
        </div>
      ) : (

        <>
      <div className="mt-3 flex items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-11 flex-1 text-base capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="lg" onClick={exportCsv} disabled={loading}>
          <Download className="size-4" /> CSV
        </Button>
      </div>

      <div className="mt-3 card-surface p-4">
        <p className="text-xs text-muted-foreground">Custo total do mês</p>
        <p className="mt-1 font-mono text-3xl font-semibold">{formatBRL(t.total)}</p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {delta == null ? (
            <span className="text-muted-foreground">Sem comparativo do mês anterior</span>
          ) : (
            <>
              {delta > 0 ? (
                <ArrowUpRight className="size-3.5 text-destructive" />
              ) : delta < 0 ? (
                <ArrowDownRight className="size-3.5 text-primary" />
              ) : (
                <Minus className="size-3.5 text-muted-foreground" />
              )}
              <span className={delta > 0 ? "text-destructive" : "text-primary"}>
                {Math.abs(delta).toFixed(0)}%
              </span>
              <span className="text-muted-foreground">
                vs. {monthLabel(prev)} ({formatBRL(tPrev.total)})
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Km rodados</p>
          <p className="mt-1 font-mono text-xl font-semibold">{formatKm(t.km)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Custo por km</p>
          <p className="mt-1 font-mono text-xl font-semibold">
            {t.perKm != null ? formatBRL(t.perKm) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="card-surface p-3">
          <Fuel className="size-4 text-primary" />
          <p className="mt-1 text-[11px] text-muted-foreground">Combustível</p>
          <p className="font-mono text-sm font-semibold">{formatBRL(t.fuel)}</p>
        </div>
        <div className="card-surface p-3">
          <Wrench className="size-4 text-primary" />
          <p className="mt-1 text-[11px] text-muted-foreground">Manutenção</p>
          <p className="font-mono text-sm font-semibold">{formatBRL(t.maintenance)}</p>
        </div>
        <div className="card-surface p-3">
          <Download className="size-4 rotate-180 text-primary" />
          <p className="mt-1 text-[11px] text-muted-foreground">Despesas</p>
          <p className="font-mono text-sm font-semibold">{formatBRL(t.expenses)}</p>
        </div>
      </div>

      <div className="mt-3 card-surface p-4">
        <h2 className="text-sm font-semibold">Composição por categoria</h2>
        {loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : pieData.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum custo lançado neste mês.</p>
        ) : (
          <>
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatBRL(Number(v))}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {pieData.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="font-mono font-medium">{formatBRL(d.value)}</span>
                  <span className="w-10 text-right text-muted-foreground">
                    {t.total > 0 ? `${((d.value / t.total) * 100).toFixed(0)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
        </>
      )}
    </AppShell>
  );
}
