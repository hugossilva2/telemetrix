import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  LIMIT_LABELS,
  PLANS,
  countInMonth,
  limitValueLabel,
  limitsForMode,
  priceLabel,
  type PlanLimits,
} from "@/lib/billing/plans";
import { useSubscription } from "@/lib/billing/subscription";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { useAccountMode } from "@/lib/account/profile";
import { isTeachingMode } from "@/lib/account/mode";
import { useMySchool, useStudents } from "@/lib/school/api";
import { useTeam } from "@/lib/school/teamApi";
import { useRides } from "@/lib/rides/api";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos · Telemetrix" },
      {
        name: "description",
        content:
          "Compare os planos Free, Pro e Frota do Telemetrix e escolha o monitoramento ideal para os seus veículos.",
      },
      { property: "og:title", content: "Planos · Telemetrix" },
      {
        property: "og:description",
        content: "Free, Pro e Frota: veículos, histórico completo, relatórios e coach de direção.",
      },
    ],
  }),
  component: PlanosPage,
});

function PlanosPage() {
  const { plan: currentPlan, limits, loading } = useSubscription();
  const { vehicles } = useActiveVehicle();
  const { mode, info } = useAccountMode();
  const teaching = isTeachingMode(mode);

  // Uso atual só do que faz sentido para o perfil (hooks ficam desligados fora dele).
  const { school } = useMySchool();
  const students = useStudents(teaching ? school?.id : null);
  const team = useTeam(mode === "autoescola" ? school?.id : null);
  const rides = useRides(mode === "app" ? startOfMonthIso() : undefined);

  const usage = useMemo<Partial<Record<keyof PlanLimits, string>>>(() => {
    const u: Partial<Record<keyof PlanLimits, string>> = {
      maxVehicles: String(vehicles.length),
    };
    if (teaching) u.maxStudents = String((students.data ?? []).filter((s) => s.active).length);
    if (mode === "autoescola")
      u.maxInstructors = String((team.data ?? []).filter((m) => m.role === "instructor").length);
    if (mode === "app") u.ridesPerMonth = String(countInMonth(rides.data ?? []));
    return u;
  }, [vehicles.length, teaching, students.data, mode, team.data, rides.data]);

  const keys = limitsForMode(mode);

  return (
    <AppShell title="Planos" subtitle={`Limites para o perfil ${info.label}`}>
      <section className="card-surface p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Crown className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">
              Seu plano: {loading ? "…" : currentPlan.toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">Perfil {info.label}</p>
          </div>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {keys.map((k) => {
            const label = limitValueLabel(k, limits);
            const used = usage[k];
            return (
              <li key={k} className="rounded-xl bg-muted/40 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {LIMIT_LABELS[k]}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {used !== undefined && typeof label === "string" && k !== "historyDays"
                    ? `${used} / ${label.replace("/mês", "")}`
                    : String(label)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {PLANS.map((p) => {
        const isCurrent = p.id === currentPlan;
        return (
          <section
            key={p.id}
            className={`card-surface p-4 ${p.highlight ? "border-primary/50" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-display text-lg font-bold leading-tight">
                  {p.name}
                  {p.highlight && <Sparkles className="size-4 text-primary" />}
                </p>
                <p className="text-xs text-muted-foreground">{p.tagline}</p>
              </div>
              <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                {priceLabel(p)}
              </p>
            </div>

            <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
              <span className="font-semibold text-primary">Para {info.label.toLowerCase()}: </span>
              {p.examples[mode]}
            </p>

            <ul className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              {keys.map((k) => (
                <li key={k} className="rounded-lg border border-border/60 p-1.5">
                  <p className="text-[10px] text-muted-foreground">{LIMIT_LABELS[k]}</p>
                  <p className="text-xs font-semibold tabular-nums">
                    {String(limitValueLabel(k, p.limits))}
                  </p>
                </li>
              ))}
            </ul>

            <ul className="mt-3 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              {isCurrent ? (
                <Button variant="secondary" className="w-full" disabled>
                  Plano atual
                </Button>
              ) : p.id === "free" ? (
                <Button variant="outline" className="w-full" disabled>
                  Incluído em todas as contas
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Assinatura em breve
                </Button>
              )}
            </div>
          </section>
        );
      })}

      <p className="text-center text-[11px] text-muted-foreground">
        O pagamento por assinatura entra na próxima fase. Enquanto isso, todas as contas seguem no
        plano Free. Dúvidas sobre o veículo monitorado?{" "}
        <Link to="/veiculos" className="text-primary underline">
          Gerenciar veículos
        </Link>
      </p>
    </AppShell>
  );
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
