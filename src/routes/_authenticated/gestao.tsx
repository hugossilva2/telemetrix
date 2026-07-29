import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Leaf, Route as RouteIcon, MapPin, ShieldCheck, UserRound, Wallet, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ExpiringDocsCard } from "@/components/docs/ExpiringDocsCard";
import { MaintenanceAlertsCard } from "@/components/maintenance/MaintenanceAlertsCard";


export const Route = createFileRoute("/_authenticated/gestao")({
  head: () => ({
    meta: [
      { title: "Gestão · Telemetrix" },
      { name: "description", content: "Motoristas, documentos do veículo e lugares favoritos em um só lugar." },
      { property: "og:title", content: "Gestão · Telemetrix" },
      { property: "og:description", content: "Motoristas, documentos do veículo e lugares favoritos." },
    ],
  }),
  component: GestaoPage,
});

const links: { to: string; label: string; desc: string; Icon: LucideIcon }[] = [
  { to: "/planejar", label: "Planejar rota", desc: "Paradas, custo estimado e desvio em tempo real", Icon: RouteIcon },
  { to: "/manutencao", label: "Manutenção", desc: "Óleo, filtros, correia e pneus", Icon: Wrench },
  { to: "/despesas", label: "Despesas", desc: "Pedágio, estacionamento, multas e seguro", Icon: Wallet },
  { to: "/eco", label: "Eco Score", desc: "Nota de direção, eventos e desperdício", Icon: Leaf },
  { to: "/relatorio", label: "Relatório mensal", desc: "Custo total, custo por km e CSV", Icon: BarChart3 },
  { to: "/motoristas", label: "Motoristas", desc: "Condutores e validade da CNH", Icon: UserRound },
  { to: "/documentos", label: "Documentos", desc: "CRLV, seguro, IPVA e licenciamento", Icon: ShieldCheck },
  { to: "/lugares", label: "Lugares", desc: "Favoritos, geofences e ETA", Icon: MapPin },
];

function GestaoPage() {
  return (
    <AppShell title="Gestão" subtitle="Manutenção, condutores e documentos">
      <MaintenanceAlertsCard />

      <ExpiringDocsCard />



      <div className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold tracking-tight">Atalhos</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {links.map(({ to, label, desc, Icon }) => (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                className="flex h-full min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-background/35 p-3 transition-all hover:border-primary/50 hover:bg-accent active:scale-[0.98]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                    {desc}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

    </AppShell>
  );
}
