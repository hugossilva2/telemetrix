import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModePicker } from "@/components/account/ModePicker";
import { useAccountMode, useSetAccountMode } from "@/lib/account/profile";
import { toUserMessage } from "@/lib/errors/userMessage";
import { isTeachingMode, type AccountMode } from "@/lib/account/mode";
import { useEnsureSchool } from "@/lib/school/api";

export const Route = createFileRoute("/_authenticated/perfil-de-uso")({
  head: () => ({
    meta: [
      { title: "Perfil de uso · Telemetrix" },
      { name: "description", content: "Escolha como você usa o Telemetrix." },
      { property: "og:title", content: "Perfil de uso · Telemetrix" },
      { property: "og:description", content: "Escolha como você usa o Telemetrix." },
    ],
  }),
  component: PerfilDeUsoPage,
});

function PerfilDeUsoPage() {
  const navigate = useNavigate();
  const { mode, profile, needsOnboarding, loading } = useAccountMode();
  const save = useSetAccountMode();
  const ensureSchool = useEnsureSchool();
  const [selected, setSelected] = useState<AccountMode>(mode);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!loading) {
      setSelected(mode);
      setDisplayName(profile?.display_name ?? "");
    }
  }, [loading, mode, profile?.display_name]);

  function submit() {
    save.mutate(
      { mode: selected, displayName },
      {
        onSuccess: async () => {
          if (isTeachingMode(selected)) {
            try {
              await ensureSchool.mutateAsync({
                name: displayName.trim() || (selected === "autoescola" ? "Minha autoescola" : "Minha escola"),
                kind: selected as "instrutor" | "autoescola",
              });
            } catch {
              /* a tela de Aulas/Alunos oferece criar depois */
            }
          }
          toast.success(needsOnboarding ? "Tudo pronto! Bem-vindo ao Telemetrix." : "Perfil de uso atualizado.");
          navigate({ to: needsOnboarding ? "/inicio" : "/ajustes", replace: true });
        },
        onError: (e: Error) =>
          toast.error(toUserMessage(e, "Não foi possível salvar o perfil. Tente de novo.")),
      },
    );
  }

  return (
    <AppShell
      title={needsOnboarding ? "Como você usa o Telemetrix?" : "Perfil de uso"}
      subtitle={
        needsOnboarding
          ? "O app se adapta ao seu dia a dia. Dá para trocar depois em Ajustes."
          : "Muda o menu, o painel e os atalhos"
      }
    >
      <section className="card-surface p-4">
        <Label htmlFor="displayName">Como quer ser chamado?</Label>
        <Input
          id="displayName"
          className="mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={selected === "autoescola" ? "Nome da autoescola" : "Seu nome"}
          disabled={loading || save.isPending}
        />
      </section>

      <ModePicker value={selected} onChange={setSelected} disabled={loading || save.isPending} />

      <Button className="w-full" onClick={submit} disabled={loading || save.isPending}>
        {save.isPending ? "Salvando..." : needsOnboarding ? "Começar" : "Salvar perfil"}
      </Button>
    </AppShell>
  );
}
