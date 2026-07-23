import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Gestão Veicular" },
      { name: "description", content: "Configurações do veículo e alertas." },
      { property: "og:title", content: "Ajustes · Gestão Veicular" },
      { property: "og:description", content: "Configurações do veículo e alertas." },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Ajustes" subtitle="Perfil e preferências">
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Configuração de veículo e alertas em breve (Fase 4).
      </div>

      <Button
        onClick={handleSignOut}
        variant="outline"
        className="mt-4 w-full"
      >
        <LogOut className="mr-2 size-4" />
        Sair da conta
      </Button>
    </AppShell>
  );
}
