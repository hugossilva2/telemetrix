import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, ShieldCheck, UserRound, Wrench } from "lucide-react";
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
  { to: "/manutencao", label: "Manutenção", desc: "Óleo, filtros, correia e pneus", Icon: Wrench },
  { to: "/motoristas", label: "Motoristas", desc: "Condutores e validade da CNH", Icon: UserRound },
  { to: "/documentos", label: "Documentos", desc: "CRLV, seguro, IPVA e licenciamento", Icon: ShieldCheck },
  { to: "/lugares", label: "Lugares", desc: "Favoritos, geofences e ETA", Icon: MapPin },
];

function GestaoPage() {
  return (
    <AppShell title="Gestão" subtitle="Manutenção, condutores e documentos">
      <MaintenanceAlertsCard />

      <ExpiringDocsCard />



      <ul className="mt-4 space-y-2">
        {links.map(({ to, label, desc, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
            >
              <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
