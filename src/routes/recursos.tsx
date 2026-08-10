import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ScreenShot } from "@/components/marketing/ScreenShot";
import { FEATURE_SECTIONS } from "@/lib/marketing/content";
import { OG_SCREENSHOT, SITE_URL } from "@/lib/demo/screens";

const TITLE = "Recursos do Telemetrix — telemetria, viagens e rastreio";
const DESCRIPTION =
  "Veja em prints reais como o Telemetrix mostra telemetria ao vivo, viagens automáticas com custo, Eco Score, manutenção e rastreamento do carro.";
const URL = `${SITE_URL}/recursos`;

export const Route = createFileRoute("/recursos")({
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
  }),
  component: RecursosPage,
});

function RecursosPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Telas reais do app · dados fictícios
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Tudo que o Telemetrix mostra sobre o seu carro
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              Do giro do motor ao custo da viagem de sábado: um tour pelas telas do app, com os
              números que você passa a ver no dia a dia.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Começar grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/demo">
                  Abrir demonstração <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {FEATURE_SECTIONS.map((section, i) => (
          <section key={section.id} id={section.id} className="px-4 py-10">
            <div
              className={`mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 ${
                i % 2 === 1 ? "md:[&>figure]:order-first" : ""
              }`}
            >
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">{section.lead}</p>
                <ul className="mt-5 space-y-2.5">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ScreenShot screen={section.screen} priority={i === 0} />
            </div>
          </section>
        ))}

        <section className="px-4 py-14">
          <div className="card-surface mx-auto max-w-3xl border-primary/40 p-6 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Veja funcionando com seu próprio carro
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Plano Free para sempre, sem cartão de crédito. Basta um adaptador OBD-II ou um
              rastreador compatível.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Criar conta grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/precos">Ver preços</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
