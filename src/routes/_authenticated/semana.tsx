import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { formatBRL } from "@/lib/format";
import { useProfitCosts, useRides, useShifts } from "@/lib/rides/api";
import {
  kmPerWeek,
  platformLabel,
  profitSummary,
  weeklyBreakdown,
  weekPeriodFromKey,
} from "@/lib/rides/profit";
import { lastWeeks, nextWeek, previousWeek, weekKey, weekLabel } from "@/lib/reports/week";

export const Route = createFileRoute("/_authenticated/semana")({
  head: () => ({
    meta: [
      { title: "Relatório semanal · Telemetrix" },
      {
        name: "description",
        content: "Semana de segunda a domingo: ganhos, corridas, horas online, km e lucro líquido do motorista de app.",
      },
      { property: "og:title", content: "Relatório semanal · Telemetrix" },
      { property: "og:description", content: "Sua semana seg–dom no formato do app de corridas." },
    ],
  }),
  component: SemanaPage,
});

const SINCE = new Date(Date.now() - 120 * 86_400_000).toISOString();

function SemanaPage() {
  const [key, setKey] = useState(() => weekKey(new Date()));
  const rides = useRides(SINCE);
  const shifts = useShifts(SINCE);
  const costs = useProfitCosts(SINCE);
  const thisWeek = weekKey(new Date());

  const input = useMemo(
    () => ({
      rides: rides.data ?? [],
      shifts: shifts.data ?? [],
      fuel: costs.data?.fuel ?? [],
      expenses: costs.data?.expenses ?? [],
    }),
    [rides.data, shifts.data, costs.data],
  );

  const period = useMemo(() => weekPeriodFromKey(key), [key]);
  const prevPeriod = useMemo(() => weekPeriodFromKey(previousWeek(key)), [key]);
  const cur = useMemo(() => profitSummary(input, period), [input, period]);
  const prev = useMemo(() => profitSummary(input, prevPeriod), [input, prevPeriod]);
  const days = useMemo(() => weeklyBreakdown(input.rides, input.shifts, period), [input, period]);
  const pace = useMemo(() => kmPerWeek(input.rides, input.shifts), [input]);
  const history = useMemo(
    () => lastWeeks(8).map((k) => ({ key: k, s: profitSummary(input, weekPeriodFromKey(k)) })),
    [input],
  );
  const maxDay = Math.max(1, ...days.map((d) => d.earnings));
  const loading = rides.isLoading || shifts.isLoading || costs.isLoading;

  return (
    <AppShell title="Relatório semanal" subtitle="Segunda a domingo, como no app de corridas">
      <div className="flex items-center justify-between rounded-xl bg-muted/60 p-1">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => setKey(previousWeek(key))}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-card"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel(key)}</p>
          <p className="text-[10px] text-muted-foreground">
            {key === thisWeek ? "semana atual" : key === previousWeek(thisWeek) ? "semana passada" : "seg – dom"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Próxima semana"
          disabled={key >= thisWeek}
          onClick={() => setKey(nextWeek(key))}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-card disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <section className="card-surface p-5">
        <p className="text-xs text-muted-foreground">Ganhos da semana</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-primary">
          {loading ? "—" : formatBRL(cur.earnings)}
        </p>
        <Delta label="vs. semana anterior" cur={cur.earnings} prev={prev.earnings} money />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Corridas" value={String(cur.rides)} />
          <Stat label="Horas online" value={cur.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
          <Stat label="Km rodados" value={cur.km.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="R$/corrida" value={cur.earningsPerRide != null ? formatBRL(cur.earningsPerRide) : "—"} />
          <Stat label="R$/hora" value={cur.profitPerHour != null ? formatBRL(cur.profitPerHour) : "—"} />
          <Stat label="R$/km" value={cur.profitPerKm != null ? formatBRL(cur.profitPerKm) : "—"} />
        </div>
      </section>

      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Dia a dia</h2>
        <ul className="mt-3 space-y-2">
          {days.map((d) => (
            <li key={d.date} className="flex items-center gap-3">
              <span className="w-8 text-xs font-semibold uppercase text-muted-foreground">{d.label}</span>
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(d.earnings / maxDay) * 100}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {d.rides} corrida{d.rides === 1 ? "" : "s"}
                  {d.hours > 0 && ` · ${d.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`}
                  {d.km > 0 && ` · ${d.km.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold">{formatBRL(d.earnings)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface divide-y divide-border/60 p-0">
        <Line label="Ganhos" hint={cur.tips > 0 ? `inclui ${formatBRL(cur.tips)} em gorjetas` : "corridas + gorjetas"} value={formatBRL(cur.earnings)} />
        <Line label="Combustível" hint="abastecimentos da semana" value={`− ${formatBRL(cur.fuelCost)}`} />
        <Line label="Outros gastos" hint="pedágio, lavagem, manutenção…" value={`− ${formatBRL(cur.otherCost)}`} />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Lucro líquido</p>
            <Delta label="vs. semana anterior" cur={cur.profit} prev={prev.profit} money compact />
          </div>
          <p className={`font-mono text-lg font-bold ${cur.profit < 0 ? "text-destructive" : "text-primary"}`}>
            {formatBRL(cur.profit)}
          </p>
        </div>
      </section>

      {cur.byPlatform.length > 0 && (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Por plataforma</h2>
          <ul className="mt-2 space-y-1.5">
            {cur.byPlatform.map((p) => (
              <li key={p.platform} className="flex items-center justify-between text-xs">
                <span className="font-medium">{platformLabel(p.platform)}</span>
                <span className="font-mono">
                  {formatBRL(p.earnings)} · {p.rides} corrida{p.rides === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Últimas 8 semanas</h2>
          {pace != null && (
            <span className="text-[11px] text-muted-foreground">
              ritmo ≈ {pace.toLocaleString("pt-BR")} km/semana
            </span>
          )}
        </div>
        <ul className="mt-2 divide-y divide-border/60">
          {history.map(({ key: k, s }) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => setKey(k)}
                className={`flex w-full items-center justify-between py-2 text-left text-xs ${k === key ? "text-primary" : ""}`}
              >
                <span className="font-medium">{weekLabel(k)}</span>
                <span className="font-mono">
                  {s.rides} · {formatBRL(s.earnings)} ·{" "}
                  <span className={s.profit < 0 ? "text-destructive" : ""}>{formatBRL(s.profit)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!loading && cur.rides === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Sem corridas nesta semana.{" "}
          <Link to="/corridas" className="font-semibold text-primary">
            Registrar corrida
          </Link>
        </p>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/35 p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

function Delta({
  label,
  cur,
  prev,
  money,
  compact,
}: {
  label: string;
  cur: number;
  prev: number;
  money?: boolean;
  compact?: boolean;
}) {
  const diff = cur - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : null;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <p className={`${compact ? "" : "mt-1"} flex items-center gap-1 text-[11px] ${tone}`}>
      <Icon className="size-3" />
      {money ? formatBRL(Math.abs(diff)) : Math.abs(diff).toLocaleString("pt-BR")}
      {pct != null && ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`}
      <span className="text-muted-foreground"> {label}</span>
    </p>
  );
}

function Line({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
