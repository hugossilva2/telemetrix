import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, Plus, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/compartilhar")({
  head: () => ({
    meta: [
      { title: "Compartilhar rastreamento · Telemetrix" },
      {
        name: "description",
        content:
          "Convide um observador (família) para acompanhar a localização do veículo em tempo real, somente leitura.",
      },
      { property: "og:title", content: "Compartilhar rastreamento · Telemetrix" },
      {
        property: "og:description",
        content: "Convide um observador somente leitura para acompanhar o veículo.",
      },
    ],
  }),
  component: SharePage,
});

type ShareRow = {
  id: string;
  vehicle_id: string;
  invited_email: string;
  label: string | null;
  accepted_at: string | null;
  created_at: string;
};

const dtf = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function SharePage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-primary-share"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,plate")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: shares, isLoading } = useQuery({
    queryKey: ["vehicle-shares", vehicle?.id],
    enabled: !!vehicle?.id,
    queryFn: async (): Promise<ShareRow[]> => {
      const { data, error } = await supabase
        .from("vehicle_shares")
        .select("id,vehicle_id,invited_email,label,accepted_at,created_at")
        .eq("vehicle_id", vehicle!.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShareRow[];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid || !vehicle?.id) throw new Error("Cadastre um veículo primeiro");
      const clean = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("E-mail inválido");
      const { error } = await supabase
        .from("vehicle_shares")
        .upsert(
          {
            owner_id: uid,
            vehicle_id: vehicle.id,
            invited_email: clean,
            label: label.trim() || null,
            revoked_at: null,
          },
          { onConflict: "vehicle_id,invited_email" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail("");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["vehicle-shares"] });
      toast.success("Convite criado", {
        description: "O observador verá o veículo ao entrar com esse e-mail.",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_shares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-shares"] });
      toast.success("Acesso removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Observadores" subtitle="Acesso somente leitura ao rastreamento">
      <div className="card-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <Eye className="size-4.5" />
          </span>
          <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            O observador (esposa, mãe, sócio) vê{" "}
            <span className="text-foreground">apenas rastreamento</span>: localização
            atual, motor ligado/desligado, viagem em andamento e eventos de segurança.
            Ele <span className="text-foreground">não</span> vê histórico de viagens,
            despesas, abastecimentos, documentos nem motoristas.
          </div>
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Convidar por e-mail
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Use o mesmo e-mail que a pessoa vai usar para entrar no app. Depois de entrar,
          ela acessa a aba “Acompanhar”.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="share-email" className="text-xs">
              E-mail do observador
            </Label>
            <Input
              id="share-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="pessoa@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="share-label" className="text-xs">
              Apelido (opcional)
            </Label>
            <Input
              id="share-label"
              placeholder="Esposa, Mãe…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            className="w-full"
            disabled={invite.isPending || !vehicle?.id}
            onClick={() => invite.mutate()}
          >
            <Plus className="size-4" /> Convidar observador
          </Button>
          {!vehicle?.id && (
            <p className="text-[11px] text-warning">
              Cadastre um veículo em Ajustes para poder compartilhar.
            </p>
          )}
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Com acesso {vehicle ? `· ${vehicle.name}` : ""}
        </h2>
        {isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : !shares || shares.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum observador convidado ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {shares.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    s.accepted_at
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.accepted_at ? (
                    <UserRoundCheck className="size-4.5" />
                  ) : (
                    <UserRoundX className="size-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {s.label || s.invited_email}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" /> {s.invited_email}
                    </span>
                    <span>
                      {s.accepted_at
                        ? `ativo desde ${dtf.format(new Date(s.accepted_at))}`
                        : "aguardando primeiro acesso"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remover acesso"
                  onClick={() => revoke.mutate(s.id)}
                  disabled={revoke.isPending}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
