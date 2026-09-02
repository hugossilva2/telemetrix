import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { LimitStatus } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/billing/plans";

interface Props {
  plan: PlanId;
  status: LimitStatus;
  /** Ex.: "alunos ativos", "corridas neste mês". */
  noun: string;
  /** Frase de incentivo ao upgrade. */
  hint?: string;
}

/** Aviso de limite do plano atingido, no mesmo padrão da tela de veículos. */
export function PlanLimitCard({ plan, status, noun, hint }: Props) {
  if (!status.atLimit) return null;
  return (
    <section className="card-surface border-primary/40 p-4">
      <p className="text-sm font-semibold">Limite do plano {plan.toUpperCase()} atingido</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Seu plano permite {status.max} {noun} e você já usa {status.used}.{" "}
        {hint ?? "Faça upgrade para continuar sem limites."}
      </p>
      <Button asChild size="sm" className="mt-3">
        <Link to="/planos">Ver planos</Link>
      </Button>
    </section>
  );
}

/** Contador discreto "3 de 5" para mostrar perto do botão de criar. */
export function LimitCounter({ status, noun }: { status: LimitStatus; noun: string }) {
  if (!Number.isFinite(status.max)) return null;
  return (
    <p className={`text-[11px] ${status.atLimit ? "text-primary" : "text-muted-foreground"}`}>
      {status.used} de {status.max} {noun}
    </p>
  );
}
