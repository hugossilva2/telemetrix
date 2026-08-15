import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { Check, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CHECKUP_LABEL,
  checkupClasses,
  summarizeCheckups,
  type CheckupDef,
  type CheckupRecord,
} from "@/lib/checkups/rules";

const SELECT = "id,item,checked_at,mileage_km,notes";

export function useCheckups() {
  return useQuery<CheckupRecord[]>({
    queryKey: ["checkups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_checkups")
        .select(SELECT)
        .order("checked_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as CheckupRecord[];
    },
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Grade de botões de rotina + histórico recente. */
export function CheckupButtons() {
  const qc = useQueryClient();
  const { telemetry } = useTelemetry();
  const mileage = telemetry.mileageKm ?? null;
  const { data: records = [], isLoading } = useCheckups();
  const summary = summarizeCheckups(records);

  const [noteFor, setNoteFor] = useState<CheckupDef | null>(null);
  const [note, setNote] = useState("");

  const register = useMutation({
    mutationFn: async (payload: { item: string; notes?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("vehicle_checkups")
        .insert({
          user_id: uid,
          item: payload.item,
          mileage_km: mileage,
          notes: payload.notes?.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id, vars) => {
      qc.invalidateQueries({ queryKey: ["checkups"] });
      toast.success(`${CHECKUP_LABEL[vars.item] ?? vars.item} conferido!`, {
        action: {
          label: "Desfazer",
          onClick: () => remove.mutate(id),
        },
      });
    },
    onError: (e: Error) =>
      toast.error(toUserMessage(e, "Não foi possível registrar a conferência. Tente de novo.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_checkups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkups"] }),
    onError: (e: Error) =>
      toast.error(toUserMessage(e, "Não foi possível remover a conferência. Tente de novo.")),
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {summary.map(({ def, info }) => {
          const pendingThis = register.isPending && register.variables?.item === def.value;
          return (
            <div
              key={def.value}
              className={`rounded-2xl border p-3 text-left transition-colors ${checkupClasses[info.status]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <def.Icon className="size-5 shrink-0" />
                <span className="rounded-full bg-background/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {def.period}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{def.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{def.hint}</p>
              <p className="mt-1 text-[11px] font-medium">{info.message}</p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  className="h-9 flex-1 text-xs"
                  disabled={pendingThis}
                  onClick={() => register.mutate({ item: def.value })}
                >
                  {pendingThis ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Conferir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-2 text-xs"
                  onClick={() => {
                    setNote("");
                    setNoteFor(def);
                  }}
                  aria-label={`Conferir ${def.label} com observação`}
                >
                  Nota
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 card-surface p-4">
        <h2 className="text-sm font-semibold">Histórico recente</h2>
        {isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : records.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhuma rotina registrada ainda. Toque em “Conferir” após checar cada item.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {records.slice(0, 30).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{CHECKUP_LABEL[r.item] ?? r.item}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatWhen(r.checked_at)}
                    {r.mileage_km != null
                      ? ` · ${Math.round(Number(r.mileage_km)).toLocaleString("pt-BR")} km`
                      : ""}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(r.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Excluir registro"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={noteFor !== null} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteFor?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="checkup-note">Observação</Label>
            <Input
              id="checkup-note"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: completei 200 ml de óleo"
              className="h-11 text-base"
            />
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={register.isPending}
              onClick={() => {
                if (!noteFor) return;
                register.mutate({ item: noteFor.value, notes: note });
                setNoteFor(null);
              }}
            >
              Registrar conferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
