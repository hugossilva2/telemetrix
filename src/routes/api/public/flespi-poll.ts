import { createFileRoute } from "@tanstack/react-router";
import { FLESPI_CONFIG } from "@/lib/flespi/config";
import { verifyWebhookSecret } from "@/lib/http/verifyWebhookSecret";
import { ingestFlespiMessages } from "@/lib/flespi/ingest.server";
import type { FlespiMessage } from "@/lib/flespi/ingest.server";

/**
 * Coletor periódico do rastreador (fallback do webhook).
 *
 * Busca na API REST da Flespi as mensagens novas de cada veículo com
 * `flespi_device_id` e as processa com a MESMA lógica do webhook: pings,
 * eventos (ignição, movimento suspeito, cercas) e abertura/fechamento de
 * viagens. Assim o rastreamento funciona 24h, sem depender do app aberto nem
 * de um stream configurado na Flespi.
 *
 * Chamado por pg_cron a cada 2 minutos com o header `x-webhook-secret`.
 */

const MAX_MESSAGES = 500;
const LOOKBACK_S = 15 * 60;


async function fetchMessages(deviceId: string, fromS: number) {
  const params = new URLSearchParams({
    data: JSON.stringify({ from: fromS, count: MAX_MESSAGES }),
  });
  const res = await fetch(
    `https://flespi.io/gw/devices/${deviceId}/messages?${params.toString()}`,
    { headers: { Authorization: `FlespiToken ${FLESPI_CONFIG.token}` } },
  );
  if (!res.ok) {
    throw new Error(`flespi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: FlespiMessage[] };
  return (json.result ?? []).slice().sort((a, b) => {
    const ta = typeof a.timestamp === "number" ? a.timestamp : 0;
    const tb = typeof b.timestamp === "number" ? b.timestamp : 0;
    return ta - tb;
  });
}

async function run(request: Request) {
  const url = new URL(request.url);
  if (!verifyWebhookSecret(request, url)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: vehicles, error } = await supabaseAdmin
    .from("vehicles")
    .select("id,flespi_device_id")
    .not("flespi_device_id", "is", null);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const vehicle of vehicles ?? []) {
    const deviceId = vehicle.flespi_device_id as string;
    try {
      const { data: state } = await supabaseAdmin
        .from("device_trip_state")
        .select("last_message_at")
        .eq("device_id", deviceId)
        .maybeSingle();

      const lastMs = state?.last_message_at
        ? new Date(state.last_message_at as string).getTime()
        : 0;
      const nowS = Date.now() / 1000;
      const fromS = lastMs > 0 ? lastMs / 1000 + 0.001 : nowS - LOOKBACK_S;

      const messages = await fetchMessages(deviceId, fromS);
      if (messages.length === 0) {
        results.push({ deviceId, fetched: 0 });
        continue;
      }
      const summary = await ingestFlespiMessages(messages);
      results.push({ deviceId, fetched: messages.length, ...summary });
    } catch (err) {
      console.error("[flespi-poll] falha no device", deviceId, err);
      results.push({
        deviceId,
        error: err instanceof Error ? err.message : "erro desconhecido",
      });
    }
  }

  return Response.json({ ok: true, devices: results });
}

export const Route = createFileRoute("/api/public/flespi-poll")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
