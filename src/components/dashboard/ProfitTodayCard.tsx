import { Link } from "@tanstack/react-router";
import { PiggyBank, Plus } from "lucide-react";
import { useMemo } from "react";
import { formatBRL } from "@/lib/format";
import { useAccountMode } from "@/lib/account/profile";
import { useOpenShift, useProfitCosts, useRides, useShifts } from "@/lib/rides/api";
import { dayPeriod, profitSummary, weekPeriod } from "@/lib/rides/profit";

/** Resumo de lucro no painel: só para o modo Motorista de app. */
export function ProfitTodayCard() {
  const { mode } = useAccountMode();
  const enabled = mode === "app";
  const rides = useRides();
  const shifts = useShifts();
  const costs = useProfitCosts();
  const { shift } = useOpenShift();

  const { today, week } = useMemo(() => {
    const input = {
      rides: rides.data ?? [],
      shifts: shifts.data ?? [],
      fuel: costs.data?.fuel ?? [],
      expenses: costs.data?.expenses ?? [],
    };
    return { today: profitSummary(input, dayPeriod()), week: profitSummary(input, weekPeriod()) };
  }, [rides.data, shifts.data, costs.data]);

  if (!enabled) return null;

  return (
    <section className="card-surface border-primary/30 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <PiggyBank className="size-4 text-primary" />
          Meu lucro
        </span>
        {shift && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            turno aberto
          </span>
        )}
      </header>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link to="/lucro" className="rounded-xl border border-border/70 bg-background/35 p-3">
          <p className="text-[11px] text-muted-foreground">Hoje</p>
          <p className={`mt-0.5 font-mono text-xl font-semibold ${today.profit < 0 ? "text-destructive" : ""}`}>
            {formatBRL(today.profit)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {today.rides} corrida{today.rides === 1 ? "" : "s"}
            {today.profitPerHour != null && ` · ${formatBRL(today.profitPerHour)}/h`}
          </p>
        </Link>
        <Link to="/lucro" className="rounded-xl border border-border/70 bg-background/35 p-3">
          <p className="text-[11px] text-muted-foreground">Semana (seg–dom)</p>
          <p className={`mt-0.5 font-mono text-xl font-semibold ${week.profit < 0 ? "text-destructive" : ""}`}>
            {formatBRL(week.profit)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {week.rides} corrida{week.rides === 1 ? "" : "s"}
            {week.profitPerKm != null && ` · ${formatBRL(week.profitPerKm)}/km`}
          </p>
        </Link>
      </div>
      <Link
        to="/corridas"
        className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
      >
        <Plus className="size-4" /> Registrar corrida
      </Link>
    </section>
  );
}
