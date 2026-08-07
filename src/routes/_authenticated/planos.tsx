import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { PLANS, priceLabel } from "@/lib/billing/plans";
import { useSubscription } from "@/lib/billing/subscription";
import { useActiveVehicle } from "@/lib/vehicles/active";

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

  return (
    <AppShell title="Planos" subtitle="Escolha o nível de monitoramento do seu veículo">
      <section className="card-surface p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Crown className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">
              Seu plano: {loading ? "…" : currentPlan.toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              {vehicles.length} de{" "}
              {Number.isFinite(limits.maxVehicles) ? limits.maxVehicles : "∞"} veículos usados ·
              histórico de{" "}
              {Number.isFinite(limits.historyDays) ? `${limits.historyDays} dias` : "todo o período"}
            </p>
          </div>
        </div>
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
