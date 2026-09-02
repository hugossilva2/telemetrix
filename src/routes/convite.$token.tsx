import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, School } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/errors/userMessage";

export const Route = createFileRoute("/convite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Convite · Telemetrix" },
      { name: "description", content: "Você foi convidado para acompanhar suas aulas no Telemetrix." },
      { property: "og:title", content: "Convite · Telemetrix" },
      { property: "og:description", content: "Aceite o convite do seu instrutor ou autoescola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConvitePage,
});

const ROLE_LABEL: Record<string, string> = { student: "aluno", instructor: "instrutor", owner: "responsável" };

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const invite = useQuery({
    queryKey: ["org-invite", token],
    enabled: signedIn === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_org_invite", { _token: token });
      if (error) throw error;
      // Conta de aluno entra direto sem escolher perfil de uso.
      const { data: u } = await supabase.auth.getUser();
      if (u.user && invite.data?.role === "student") {
        await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", u.user.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Convite aceito! Bem-vindo.");
      navigate({ to: invite.data?.role === "student" ? "/aluno" : "/inicio", replace: true });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível aceitar o convite.")),
  });

  const redirect = `/convite/${token}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-surface w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          {invite.data?.org_kind === "autoescola" ? <School className="size-7" /> : <GraduationCap className="size-7" />}
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">Convite Telemetrix</h1>

        {signedIn === null ? (
          <p className="mt-2 text-sm text-muted-foreground">Verificando…</p>
        ) : signedIn === false ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre ou crie sua conta para aceitar o convite do seu instrutor.
            </p>
            <Link
              to="/auth"
              search={{ redirect }}
              className="mt-4 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              Entrar ou criar conta
            </Link>
          </>
        ) : invite.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Carregando convite…</p>
        ) : !invite.data ? (
          <p className="mt-2 text-sm text-destructive">Convite não encontrado.</p>
        ) : invite.data.accepted ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Este convite já foi utilizado.</p>
            <Link to="/aluno" className="mt-4 inline-block text-sm font-semibold text-primary">
              Ir para Meu progresso
            </Link>
          </>
        ) : invite.data.expired ? (
          <p className="mt-2 text-sm text-destructive">Convite expirado. Peça um novo ao seu instrutor.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong className="text-foreground">{invite.data.org_name}</strong> convidou você como{" "}
              {ROLE_LABEL[invite.data.role] ?? invite.data.role}
              {invite.data.student_name && (
                <>
                  {" "}
                  (<span className="text-foreground">{invite.data.student_name}</span>)
                </>
              )}
              .
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invite.data.role === "instructor"
                ? "Sua conta passa para o perfil Instrutor e você verá a agenda, os alunos e os carros da escola."
                : "Você verá suas aulas, trajetos, pontuação de direção e as observações do instrutor."}
            </p>
            <Button className="mt-4 h-11 w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
              {accept.isPending ? "Aceitando…" : "Aceitar convite"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
