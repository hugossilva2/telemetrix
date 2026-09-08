import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { priceLabel, type PlanInfo } from "@/lib/billing/plans";

/**
 * Card de plano usado na home e na página de preços.
 * `headingLevel` mantém a hierarquia de títulos correta em cada página.
 */
export function PlanCard({
  plan,
  headingLevel = "h3",
}: {
  plan: PlanInfo;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article
      className={`card-surface flex flex-col p-5 ${plan.highlight ? "border-primary/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Heading className="font-display text-lg font-bold">{plan.name}</Heading>
        {plan.highlight && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Mais escolhido
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums">{priceLabel(plan)}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-5" variant={plan.highlight ? "default" : "outline"}>
        <Link to="/auth">
          {plan.priceMonthly > 0 ? `Assinar ${plan.name}` : "Começar grátis"}
        </Link>
      </Button>
    </article>
  );
}
