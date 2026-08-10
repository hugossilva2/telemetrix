import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PLANS, priceLabel } from "@/lib/billing/plans";
import { OG_SCREENSHOT, SITE_URL } from "@/lib/demo/screens";

const TITLE = "Preços do Telemetrix — planos Free, Pro e Frota";
const DESCRIPTION =
  "Compare os planos do Telemetrix: telemetria e Eco Score grátis, histórico completo e relatórios no Pro, veículos ilimitados e motoristas no Frota.";
const URL = `${SITE_URL}/precos`;

const FAQ = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. A assinatura é mensal e sem fidelidade. Ao cancelar, sua conta volta para o plano Free e o histórico continua salvo.",
  },
  {
    q: "Preciso de cartão de crédito para o plano Free?",
    a: "Não. O plano Free é gratuito para sempre, com 1 veículo, telemetria ao vivo, Eco Score e 7 dias de histórico de viagens.",
  },
  {
    q: "O que acontece se eu passar do limite de veículos?",
    a: "O app avisa antes de cadastrar. Os veículos já registrados continuam acessíveis; para adicionar mais é preciso subir de plano.",
  },
  {
    q: "O adaptador OBD-II está incluso?",
    a: "Não. O hardware é comprado separadamente (um ELM327 Bluetooth custa a partir de cerca de R$ 60) ou você usa um rastreador compatível que já tenha.",
  },
  {
    q: "A cobrança é em reais?",
    a: "Sim, os preços são em reais e cobrados mensalmente.",
  },
];

const MATRIX: { label: string; get: (i: number) => boolean | string }[] = [
  {
    label: "Veículos",
    get: (i) => {
      const n = PLANS[i].limits.maxVehicles;
      return Number.isFinite(n) ? String(n) : "Ilimitados";
    },
  },
  {
    label: "Histórico de viagens",
    get: (i) => {
      const d = PLANS[i].limits.historyDays;
      return Number.isFinite(d) ? `${d} dias` : "Completo";
    },
  },
  { label: "Telemetria ao vivo e Eco Score", get: () => true },
  { label: "Relatórios e tendências", get: (i) => PLANS[i].limits.reports },
  { label: "Coach de direção com IA", get: (i) => PLANS[i].limits.aiCoach },
  { label: "Rotinas por cerca virtual", get: (i) => PLANS[i].limits.automations },
  { label: "Compartilhar rastreamento", get: (i) => PLANS[i].limits.sharing },
  { label: "Motoristas e ranking", get: (i) => PLANS[i].limits.fleet },
];

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_SCREENSHOT.absoluteUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_SCREENSHOT.absoluteUrl },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: PrecosPage,
});

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="tabular-nums">{value}</span>;
  return value ? (
    <Check className="mx-auto size-4 text-primary" aria-label="Incluído" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Não incluído" />
  );
}

function PrecosPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main>
        <section className="px-4 py-14 text-center">
          <h1 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Preços simples, em reais, sem fidelidade
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Comece no plano Free e mude quando precisar de mais veículos, histórico ou motoristas.
          </p>
        </section>

        <section className="px-4">
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`card-surface flex flex-col p-5 ${plan.highlight ? "border-primary/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">{plan.name}</h2>
                  {plan.highlight && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Mais escolhido
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                <p className="mt-3 font-display text-2xl font-bold tabular-nums">
                  {priceLabel(plan)}
                </p>
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
            ))}
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Comparativo de recursos
            </h2>
            <div className="card-surface mt-5 overflow-x-auto p-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-3 text-left font-semibold">
                      Recurso
                    </th>
                    {PLANS.map((p) => (
                      <th key={p.id} scope="col" className="px-4 py-3 text-center font-semibold">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.label} className="border-b border-border/40 last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        {row.label}
                      </th>
                      {PLANS.map((p, i) => (
                        <td key={p.id} className="px-4 py-3 text-center text-muted-foreground">
                          <Cell value={row.get(i)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="px-4 pb-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Dúvidas sobre cobrança
            </h2>
            <div className="mt-5 space-y-3">
              {FAQ.map(({ q, a }) => (
                <article key={q} className="card-surface p-4">
                  <h3 className="font-semibold leading-tight">{q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
