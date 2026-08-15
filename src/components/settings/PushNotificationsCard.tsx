import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { disablePush, enablePush, isPushEnabled, pushSupport } from "@/lib/push/client";
import { sendTestPush } from "@/lib/push/push.functions";

/** Ativa/desativa notificações push reais neste dispositivo. */
export function PushNotificationsCard() {
  const qc = useQueryClient();
  const test = useServerFn(sendTestPush);
  const [support, setSupport] = useState<ReturnType<typeof pushSupport>>("unsupported");

  useEffect(() => {
    setSupport(pushSupport());
  }, []);

  const { data: enabled = false, isLoading } = useQuery({
    queryKey: ["push-enabled"],
    queryFn: isPushEnabled,
  });

  const { data: deviceCount = 0 } = useQuery({
    queryKey: ["push-devices"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) await enablePush();
      else await disablePush();
    },
    onSuccess: (_d, next) => {
      toast.success(
        next ? "Notificações ativadas neste dispositivo." : "Notificações desativadas.",
      );
      qc.invalidateQueries({ queryKey: ["push-enabled"] });
      qc.invalidateQueries({ queryKey: ["push-devices"] });
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível atualizar as notificações neste dispositivo."),
      ),
  });

  const sendTest = useMutation({
    mutationFn: async () => test({ data: undefined }),
    onSuccess: (r) => {
      if (r.sent > 0) toast.success(`Teste enviado para ${r.sent} dispositivo(s).`);
      else toast.error("Nenhum dispositivo recebeu. Ative as notificações e tente de novo.");
    },
    onError: (e: Error) =>
      toast.error(toUserMessage(e, "Não foi possível enviar a notificação de teste.")),
  });

  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          {enabled ? <Bell className="size-4.5" /> : <BellOff className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-semibold tracking-tight">Notificações push</h2>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Receba alertas de ignição, movimento sem motor, cercas virtuais e perda de sinal mesmo
            com o app fechado.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={isLoading || toggle.isPending || support !== "ok"}
          onCheckedChange={(v) => toggle.mutate(v)}
          aria-label="Ativar notificações push"
        />
      </div>

      {support === "unsupported" && (
        <p className="mt-3 rounded-xl border border-border/70 bg-background/35 p-2.5 text-[11px] text-muted-foreground">
          Este navegador não suporta push. No iPhone, adicione o app à tela de início primeiro.
        </p>
      )}
      {support === "denied" && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-[11px] text-destructive">
          As notificações estão bloqueadas para este site. Libere nas permissões do navegador.
        </p>
      )}
      {support === "ok" && !enabled && (
        <p className="mt-3 rounded-xl border border-border/70 bg-background/35 p-2.5 text-[11px] text-muted-foreground">
          Funciona no app publicado / instalado na tela de início — não no preview do editor.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          {deviceCount} dispositivo(s) cadastrado(s)
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={sendTest.isPending || deviceCount === 0}
          onClick={() => sendTest.mutate()}
        >
          <Send className="size-3.5" /> Testar
        </Button>
      </div>
    </div>
  );
}
