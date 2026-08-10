import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  Bluetooth,
  Check,
  Fuel,
  Gauge,
  Leaf,
  MapPin,
  Radar,
  Route as RouteIcon,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, priceLabel } from "@/lib/billing/plans";
import mockupPainel from "@/assets/mockup-painel.png";
import mockupRastreador from "@/assets/mockup-rastreador.png";

const SITE = "https://telemetrix.lovable.app";
const TITLE = "Telemetrix — telemetria e rastreamento do seu carro";
const DESCRIPTION =
  "Acompanhe seu carro em tempo real: telemetria via OBD-II ou rastreador, viagens, consumo, Eco Score, manutenção e alertas no celular.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { property: "og:image", content: OG_SCREENSHOT.absoluteUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_SCREENSHOT.absoluteUrl },

    ],
    links: [{ rel: "canonical", href: SITE }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Telemetrix",
          applicationCategory: "AutomotiveApplication",
          operatingSystem: "Web, Android, iOS",
          description: DESCRIPTION,
          url: SITE,
          offers: PLANS.map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: p.priceMonthly.toFixed(2),
            priceCurrency: "BRL",
          })),
        }),
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    Icon: Gauge,
    title: "Telemetria ao vivo",
    text: "Velocidade, RPM, temperatura e combustível direto do motor, em tempo real.",
  },
  {
    Icon: Radar,
    title: "Rastreamento e cerca virtual",
    text: "Veja onde o carro está, o último ponto estacionado e receba alertas de movimento.",
  },
  {
    Icon: RouteIcon,
    title: "Histórico de viagens",
    text: "Cada viagem com rota no mapa, duração, velocidade média e custo estimado.",
  },
  {
    Icon: Leaf,
    title: "Eco Score",
    text: "Pontuação de direção com frenagens bruscas, acelerações e faixa ideal de giro.",
  },
  {
    Icon: Fuel,
    title: "Consumo e abastecimentos",
    text: "Registre abastecimentos e acompanhe km/L real e gasto por mês.",
  },
  {
    Icon: Wrench,
    title: "Manutenção e documentos",
    text: "Alertas de troca de óleo, filtros e vencimento de CNH, CRLV e seguro.",
  },
  {
    Icon: MapPin,
    title: "Viagem longa",
    text: "Autonomia real, pontos de parada e avisos de fadiga a cada duas horas.",
  },
  {
    Icon: BellRing,
    title: "Alertas para observadores",
    text: "Compartilhe o trajeto com a família e envie notificações automáticas.",
  },
];

const steps = [
  {
    Icon: Bluetooth,
    title: "1. Conecte",
    text: "Use um adaptador OBD-II ELM327 por Bluetooth ou um rastreador na nuvem.",
  },
  {
    Icon: Activity,
    title: "2. Dirija",
    text: "O app registra a viagem automaticamente ao ligar e encerra ao desligar o motor.",
  },
  {
    Icon: ShieldCheck,
    title: "3. Acompanhe",
    text: "Painel, relatórios e alertas sempre atualizados, com dados salvos na sua conta.",
  },
];

const faq = [
  {
    q: "Preciso de um rastreador para usar?",
    a: "Não. Com um adaptador OBD-II ELM327 (a partir de R$ 60) o próprio celular lê os dados do motor e usa o GPS. Se você já tem um rastreador compatível, basta informar o ID do dispositivo.",
  },
  {
    q: "Funciona no iPhone?",
    a: "O Telemetrix é um PWA e pode ser instalado na tela inicial de Android e iPhone. A leitura Bluetooth do ELM327 depende do navegador; no iPhone recomendamos usar um rastreador.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. A assinatura é mensal e sem fidelidade — ao cancelar você continua com o plano Free.",
  },
  {
    q: "Meus dados de localização ficam privados?",
    a: "Sim. Cada conta vê apenas os próprios veículos, e o histórico só é compartilhado com quem você convidar como observador.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Activity className="size-4" />
            </span>
            Telemetrix
          </span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 py-14 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                OBD-II ou rastreador · sem instalação em oficina
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                O painel do seu carro no celular, em tempo real
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Telemetria ao vivo, rastreamento, histórico de viagens com custo real, Eco Score e
                alertas de manutenção — tudo em um app leve que instala na tela inicial.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">Começar grátis</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#planos">Ver planos</a>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Plano Free para sempre · sem cartão de crédito
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <img
                src={mockupPainel}
                alt="Painel do Telemetrix mostrando velocidade, RPM, combustível e Eco Score"
                width={720}
                height={1280}
                className="w-40 max-w-full drop-shadow-2xl sm:w-52"
              />
              <img
                src={mockupRastreador}
                alt="Tela de rastreamento do Telemetrix com rota no mapa e ponto estacionado"
                width={720}
                height={1280}
                loading="lazy"
                className="mt-8 w-40 max-w-full drop-shadow-2xl sm:w-52"
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-12" id="recursos">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo sobre o carro em um só lugar
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ Icon, title, text }) => (
                <article key={title} className="card-surface p-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-3 font-semibold leading-tight">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12" id="como-funciona">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Como funciona
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {steps.map(({ Icon, title, text }) => (
                <article key={title} className="card-surface p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12" id="planos">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Planos que crescem com você
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Comece grátis e faça upgrade quando precisar de mais veículos ou relatórios.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={`card-surface flex flex-col p-5 ${
                    plan.highlight ? "border-primary/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
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
                  <Button
                    asChild
                    className="mt-5"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link to="/auth">
                      {plan.priceMonthly > 0 ? `Assinar ${plan.name}` : "Começar grátis"}
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12" id="faq">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Perguntas frequentes
            </h2>
            <div className="mt-6 space-y-3">
              {faq.map(({ q, a }) => (
                <article key={q} className="card-surface p-4">
                  <h3 className="font-semibold leading-tight">{q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="card-surface mx-auto max-w-3xl border-primary/40 p-6 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Pronto para conhecer seu carro de verdade?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie a conta em menos de um minuto e conecte seu veículo hoje.
            </p>
            <Button asChild size="lg" className="mt-5">
              <Link to="/auth">Criar conta grátis</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Telemetrix. Todos os direitos reservados.</span>
          <span className="flex gap-4">
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <Link to="/auth">Entrar</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
