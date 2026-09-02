import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Car, Fuel, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { formatBRL } from "@/lib/format";
import { useProfitCosts, useRides, useShifts } from "@/lib/rides/api";
import {
  dailyEarnings,
  dayPeriod,
  monthPeriod,
  platformLabel,
  profitSummary,
  weekPeriod,
  type Period,
} from "@/lib/rides/profit";

export const Route = createFileRoute("/_authenticated/lucro")({
  head: () => ({
    meta: [
      { title: "Meu lucro · Telemetrix" },
      { name: "description", content: "Ganhos menos combustível e despesas: lucro por dia, semana e mês, R$/km e R$/hora." },
      { property: "og:title", content: "Meu lucro · Telemetrix" },
      { property: "og:description", content: "Lucro real do motorista de app." },
    ],
  }),
  component: LucroPage,
});

type Range = "dia" | "semana" | "mes";

function periodFor(r: Range): Period {
  return r === "dia" ? dayPeriod() : r === "semana" ? weekPeriod() : monthPeriod();
}

function periodLabel(r: Range, p: Period): string {
  const f = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (r === "dia") return "Hoje";
  const last = new Date(p.end.getTime() - 1);
  return `${f(p.start)} – ${f(last)}`;
}

function LucroPage() {
  const [range, setRange] = useState<Range>("semana");
  const rides = useRides();
  const shifts = useShifts();
  const costs = useProfitCosts();

  const period = useMemo(() => periodFor(range), [range]);
  const summary = useMemo(
    () =>
      profitSummary(
        {
          rides: rides.data ?? [],
          shifts: shifts.data ?? [],
          fuel: costs.data?.fuel ?? [],
          expenses: costs.data?.expenses ?? [],
        },
        period,
      ),
    [rides.data, shifts.data, costs.data, period],
  );
  const chart = useMemo(
    () => (range === "dia" ? [] : dailyEarnings(rides.data ?? [], period)),
    [rides.data, period, range],
  );

  const loading = rides.isLoading || shifts.isLoading || costs.isLoading;
  const positive = summary.profit >= 0;

  return (
    <AppShell title="Meu lucro" subtitle="Ganhos − combustível − gastos">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-1">
        {(["dia", "semana", "mes"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
              range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {r === "dia" ? "Hoje" : r === "semana" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>

      <section className="card-surface p-5">
        <p className="text-xs text-muted-foreground">{periodLabel(range, period)}</p>
        <p
          className={`mt-1 font-mono text-4xl font-bold tracking-tight ${
            positive ? "text-primary" : "text-destructive"
          }`}
        >
          {loading ? "—" : formatBRL(summary.profit)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          lucro líquido · {summary.rides} corrida{summary.rides === 1 ? "" : "s"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kpi label="R$/km" value={summary.profitPerKm != null ? formatBRL(summary.profitPerKm) : "—"} hint={`${summary.km.toLocaleString("pt-BR")} km`} />
          <Kpi label="R$/hora" value={summary.profitPerHour != null ? formatBRL(summary.profitPerHour) : "—"} hint={`${summary.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h de turno`} />
        </div>
      </section>

      <section className="card-surface divide-y divide-border/60 p-0">
        <Row Icon={Car} label="Ganhos" hint={summary.tips > 0 ? `inclui ${formatBRL(summary.tips)} em gorjetas` : "corridas + gorjetas"} value={formatBRL(summary.earnings)} />
        <Row Icon={Fuel} label="Combustível" hint="abastecimentos do período" value={`− ${formatBRL(summary.fuelCost)}`} />
        <Row Icon={Wallet} label="Outros gastos" hint="pedágio, lavagem, manutenção…" value={`− ${formatBRL(summary.otherCost)}`} />
      </section>

      {chart.length > 0 && (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Ganhos por dia</h2>
          <div className="mt-2 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  formatter={(v: number) => [formatBRL(v), "Ganhos"]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {summary.byPlatform.length > 0 && (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Por plataforma</h2>
          <ul className="mt-2 space-y-2">
            {summary.byPlatform.map((p) => {
              const pct = summary.earnings > 0 ? (p.earnings / summary.earnings) * 100 : 0;
              return (
                <li key={p.platform}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{platformLabel(p.platform)}</span>
                    <span className="font-mono">
                      {formatBRL(p.earnings)} · {p.rides}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!loading && summary.rides === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Sem corridas neste período.{" "}
          <Link to="/corridas" className="font-semibold text-primary">
            Registrar corrida
          </Link>
        </p>
      )}
    </AppShell>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/35 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Row({
  Icon,
  label,
  hint,
  value,
}: {
  Icon: typeof Car;
  label: string;
  hint: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
