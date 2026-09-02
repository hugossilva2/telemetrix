import { useState } from "react";
import { toast } from "sonner";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccountMode } from "@/lib/account/profile";
import { useEnsureSchool } from "@/lib/school/api";
import { toUserMessage } from "@/lib/errors/userMessage";

/** Cria a "escola" (mesmo modelo para instrutor autônomo e autoescola). */
export function SchoolSetupCard() {
  const { mode, profile } = useAccountMode();
  const ensure = useEnsureSchool();
  const isSchool = mode === "autoescola";
  const [name, setName] = useState(profile?.display_name ?? "");

  return (
    <section className="card-surface p-4">
      <div className="flex items-center gap-2">
        <School className="size-5 text-primary" />
        <h2 className="text-sm font-semibold">{isSchool ? "Cadastrar autoescola" : "Configurar minha escola"}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {isSchool
          ? "Seus instrutores e alunos ficam vinculados a ela."
          : "Seus alunos e aulas ficam organizados aqui. Só você tem acesso."}
      </p>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="school-name">{isSchool ? "Nome da autoescola" : "Nome (como os alunos veem)"}</Label>
        <Input
          id="school-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isSchool ? "Autoescola Central" : "Instrutor João"}
          className="h-11"
        />
      </div>
      <Button
        className="mt-3 w-full"
        disabled={ensure.isPending}
        onClick={() =>
          ensure.mutate(
            { name, kind: isSchool ? "autoescola" : "instrutor" },
            {
              onSuccess: () => toast.success("Tudo pronto! Agora cadastre seus alunos."),
              onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível criar a escola.")),
            },
          )
        }
      >
        {ensure.isPending ? "Criando…" : "Começar"}
      </Button>
    </section>
  );
}
