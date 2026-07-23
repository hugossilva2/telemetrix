import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · Gestão Veicular" },
      { name: "description", content: "Localização do veículo em tempo real." },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  return (
    <AppShell title="Mapa" subtitle="Localização em tempo real">
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Em breve (Fase 2).
      </div>
    </AppShell>
  );
}
