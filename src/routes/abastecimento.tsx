import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/abastecimento")({
  head: () => ({
    meta: [
      { title: "Abastecimento · Gestão Veicular" },
      { name: "description", content: "Registre abastecimentos e acompanhe o custo por km." },
    ],
  }),
  component: AbastecimentoPage,
});

function AbastecimentoPage() {
  return (
    <AppShell title="Abastecimento" subtitle="Registro e histórico">
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Em breve (Fase 3).
      </div>
    </AppShell>
  );
}
