import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSecret } from "@/lib/http/verifyWebhookSecret";

/**
 * Heartbeat de perda de sinal.
 * Chamado por pg_cron a cada 5 min com o header `x-webhook-secret`:
 *   POST https://telemetrix.lovable.app/api/public/tracker-heartbeat
 * Também aceita `?secret=<FLESPI_WEBHOOK_SECRET>` para testes manuais.
 *
 * Regra: se `device_trip_state.last_message_at` (ou vehicles.updated_at)
 * ficar mais de SIGNAL_LOST_THRESHOLD_MIN sem novas mensagens, insere um
 * `tracker_events: signal_lost` e marca `vehicles.signal_lost_notified_at`
 * para não repetir até o sinal voltar (o webhook limpa a flag).
 */


// Com ignição ligada o rastreador reporta a cada poucos segundos, então 15 min
// sem mensagem já é perda de sinal. Estacionado, o FMC003 entra em modo de
// economia e manda apenas um keep-alive por hora — usar 10 min aqui gerava
// alerta de "sinal perdido" toda hora com o carro parado na garagem.
const SIGNAL_LOST_THRESHOLD_MIN = 15;
const PARKED_SIGNAL_LOST_THRESHOLD_MIN = 180;
// Evita repetição em sequência mesmo que o keep-alive limpe a flag.
const REALERT_COOLDOWN_MIN = 360;

export const Route = createFileRoute("/api/public/tracker-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyWebhookSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }


        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendTrackerEventPush } = await import("@/lib/push/send.server");

        const nowMs = Date.now();
        const cutoffMs = nowMs - SIGNAL_LOST_THRESHOLD_MIN * 60 * 1000;
        const parkedCutoffMs = nowMs - PARKED_SIGNAL_LOST_THRESHOLD_MIN * 60 * 1000;
        const cutoffIso = new Date(cutoffMs).toISOString();

        const { data: vehicles } = await supabaseAdmin
          .from("vehicles")
          .select("id,user_id,flespi_device_id,alert_signal_lost,tracker_mode,signal_lost_notified_at")
          .eq("tracker_mode", true)
          .eq("alert_signal_lost", true)
          .not("flespi_device_id", "is", null);

        let flagged = 0;
        let checked = 0;

        for (const v of vehicles ?? []) {
          checked++;
          if (v.signal_lost_notified_at) continue; // já notificado até voltar sinal

          const { data: state } = await supabaseAdmin
            .from("device_trip_state")
            .select("last_message_at,last_lat,last_lng,ignition_on")
            .eq("device_id", v.flespi_device_id as string)
            .maybeSingle();

          const lastMsg = state?.last_message_at;
          if (!lastMsg) continue; // nunca recebemos mensagem — não alertar
          const lastMsgMs = new Date(lastMsg as string).getTime();
          // Estacionado o keep-alive é horário; só alerta após um silêncio longo.
          const effectiveCutoffMs =
            state?.ignition_on === true ? cutoffMs : parkedCutoffMs;
          if (lastMsgMs > effectiveCutoffMs) continue; // ainda em dia

          // Não repetir alertas em sequência (keep-alive limpa a flag do veículo).
          const { data: recentAlert } = await supabaseAdmin
            .from("tracker_events")
            .select("id")
            .eq("vehicle_id", v.id as string)
            .eq("type", "signal_lost")
            .gte(
              "occurred_at",
              new Date(nowMs - REALERT_COOLDOWN_MIN * 60 * 1000).toISOString(),
            )
            .limit(1)
            .maybeSingle();
          if (recentAlert) continue;

          await supabaseAdmin.from("tracker_events").insert({
            user_id: v.user_id,
            vehicle_id: v.id,
            type: "signal_lost",
            lat: state?.last_lat ?? null,
            lng: state?.last_lng ?? null,
            metadata: {
              last_message_at: lastMsg,
              threshold_min:
                state?.ignition_on === true
                  ? SIGNAL_LOST_THRESHOLD_MIN
                  : PARKED_SIGNAL_LOST_THRESHOLD_MIN,
              parked: state?.ignition_on !== true,
            },
          });

          await supabaseAdmin
            .from("vehicles")
            .update({ signal_lost_notified_at: new Date().toISOString() })
            .eq("id", v.id);

          await sendTrackerEventPush(v.user_id as string, "signal_lost", { vehicleId: v.id as string });

          flagged++;
        }

        return Response.json({
          ok: true,
          checked,
          flagged,
          threshold_min: SIGNAL_LOST_THRESHOLD_MIN,
          cutoff: cutoffIso,
        });
      },
    },
  },
});
