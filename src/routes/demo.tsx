import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/marketing/PhoneFrame";
import { DEMO_SCREENS, DemoScreen, type DemoScreenId } from "@/components/demo/DemoScreens";
import { DEMO_VEHICLES } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

const SITE = "https://telemetrix.lovable.app";
const TITLE = "Demonstração do Telemetrix — veja o app funcionando";
const DESCRIPTION =
  "Navegue pelo painel, viagens, relatório, abastecimentos e rastreador do Telemetrix com dados de exemplo, sem criar conta.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/demo` },
      { property: "og:image", content: OG_SCREENSHOT.absoluteUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_SCREENSHOT.absoluteUrl },

    ],
    links: [{ rel: "canonical", href: `${SITE}/demo` }],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [screen, setScreen] = useState<DemoScreenId>("painel");

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Activity className="size-4" />
            </span>
            Telemetrix
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Criar conta grátis</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2 text-center text-xs font-semibold text-warning">
          Demonstração — todos os dados desta página são fictícios
        </div>

        <h1 className="mt-6 text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Veja o Telemetrix funcionando
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Toque nas abas para navegar pelas telas reais do app com uma frota de exemplo —
          {" "}
          {DEMO_VEHICLES.map((v) => v.name.split(" ").slice(0, 2).join(" ")).join(", ")}.
        </p>

        <nav className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {DEMO_SCREENS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setScreen(id)}
              aria-current={screen === id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                screen === id
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/70 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          <PhoneFrame label={`Tela ${screen} do Telemetrix`}>
            <DemoScreen id={screen} />
          </PhoneFrame>
        </div>

        <div className="card-surface mx-auto mt-10 max-w-2xl border-primary/40 p-6 text-center">
          <h2 className="font-display text-xl font-bold">Gostou? Conecte seu carro em minutos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Com um adaptador OBD-II ou um rastreador compatível, o app começa a registrar suas
            viagens automaticamente.
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link to="/auth">
              Começar grátis <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
