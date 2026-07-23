import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Gestão Veicular" },
      { name: "description", content: "Configurações do veículo e alertas." },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  return (
    <AppShell title="Ajustes" subtitle="Veículo e alertas">
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Em breve (Fase 4).
      </div>
    </AppShell>
  );
}
