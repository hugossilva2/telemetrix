import { createFileRoute } from "@tanstack/react-router";

/**
 * Heartbeat de perda de sinal.
 * Chamar periodicamente (ex.: pg_cron a cada 5 min):
 *   POST https://drive-wise-69.lovable.app/api/public/tracker-heartbeat?secret=<FLESPI_WEBHOOK_SECRET>
 *
 * Regra: se `device_trip_state.last_message_at` (ou vehicles.updated_at)
 * ficar mais de SIGNAL_LOST_THRESHOLD_MIN sem novas mensagens, insere um
 * `tracker_events: signal_lost` e marca `vehicles.signal_lost_notified_at`
 * para não repetir até o sinal voltar (o webhook limpa a flag).
 */

const SIGNAL_LOST_THRESHOLD_MIN = 10;

export const Route = createFileRoute("/api/public/tracker-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.FLESPI_WEBHOOK_SECRET;
        if (!expected) return new Response("Server not configured", { status: 500 });
        const url = new URL(request.url);
        const provided =
          url.searchParams.get("secret") ??
          request.headers.get("x-webhook-secret") ??
          "";
        if (provided !== expected) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const cutoffMs = Date.now() - SIGNAL_LOST_THRESHOLD_MIN * 60 * 1000;
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
            .select("last_message_at,last_lat,last_lng")
            .eq("device_id", v.flespi_device_id as string)
            .maybeSingle();

          const lastMsg = state?.last_message_at;
          if (!lastMsg) continue; // nunca recebemos mensagem — não alertar
          if (new Date(lastMsg as string).getTime() > cutoffMs) continue; // ainda em dia

          await supabaseAdmin.from("tracker_events").insert({
            user_id: v.user_id,
            vehicle_id: v.id,
            type: "signal_lost",
            lat: state?.last_lat ?? null,
            lng: state?.last_lng ?? null,
            metadata: {
              last_message_at: lastMsg,
              threshold_min: SIGNAL_LOST_THRESHOLD_MIN,
            },
          });

          await supabaseAdmin
            .from("vehicles")
            .update({ signal_lost_notified_at: new Date().toISOString() })
            .eq("id", v.id);

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
