import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ScreenShot } from "@/components/marketing/ScreenShot";
import { USE_CASES, USE_CASE_LIST, type UseCase } from "@/lib/marketing/content";
import { PLAN_BY_ID, priceLabel } from "@/lib/billing/plans";
import { SCREENSHOT_BY_ID, SITE_URL } from "@/lib/demo/screens";

export const Route = createFileRoute("/casos-de-uso/$slug")({
  loader: ({ params }) => {
    const useCase = USE_CASES[params.slug as UseCase["slug"]];
    if (!useCase) throw notFound();
    return { useCase };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/casos-de-uso/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Caso de uso indisponível — Telemetrix" }, { name: "robots", content: "noindex" }],
      };
    }
    const { useCase } = loaderData;
    const title = `${useCase.title} — Telemetrix`;
    const image = SCREENSHOT_BY_ID[useCase.screens[0]].absoluteUrl;
    return {
      meta: [
        { title },
        { name: "description", content: useCase.description },
        { property: "og:title", content: title },
        { property: "og:description", content: useCase.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: UseCaseNotFound,
  component: UseCasePage,
});

function UseCaseNotFound() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Caso de uso não encontrado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha um dos perfis abaixo para ver como o Telemetrix ajuda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {USE_CASE_LIST.map((u) => (
            <Button key={u.slug} asChild variant="outline" size="sm">
              <Link to="/casos-de-uso/$slug" params={{ slug: u.slug }}>
                {u.label}
              </Link>
            </Button>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function UseCasePage() {
  const { useCase } = Route.useLoaderData();
  const plan = PLAN_BY_ID[useCase.plan];

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-5xl">
            <nav className="flex flex-wrap gap-2">
              {USE_CASE_LIST.map((u) => (
                <Link
                  key={u.slug}
                  to="/casos-de-uso/$slug"
                  params={{ slug: u.slug }}
                  activeProps={{ className: "border-primary/50 bg-primary/15 text-primary" }}
                  inactiveProps={{ className: "border-border/70 text-muted-foreground" }}
                  className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground"
                >
                  {u.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
              <div>
                <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  {useCase.title}
                </h1>
                <p className="mt-4 text-base text-muted-foreground">{useCase.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/auth">Começar grátis</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/demo">
                      Ver demonstração <ArrowRight className="ml-1 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <ScreenShot screen={SCREENSHOT_BY_ID[useCase.screens[0]]} priority />
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">O que costuma incomodar</h2>
            <ul className="mt-5 space-y-3">
              {useCase.pain.map((p) => (
                <li key={p} className="card-surface flex gap-3 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span className="text-muted-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Como o Telemetrix resolve
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {useCase.solution.map((s) => (
                <article key={s.title} className="card-surface p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Check className="size-4" />
                  </span>
                  <h3 className="mt-3 font-semibold leading-tight">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Telas que você mais usa</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {useCase.screens.map((id) => (
                <ScreenShot key={id} screen={SCREENSHOT_BY_ID[id]} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="card-surface mx-auto max-w-3xl border-primary/40 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Plano recomendado
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              {plan.name} · {priceLabel(plan)}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{useCase.planReason}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Criar conta grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/precos">Comparar planos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
