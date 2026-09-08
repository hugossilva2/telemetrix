import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFlespiMessage } from "./parse";
import type { VehicleTelemetry } from "./types";

/**
 * Busca a última mensagem do device via REST da Flespi (no servidor, com o
 * token privado). O MQTT só entrega mensagens novas: com o carro parado o
 * rastreador pode ficar minutos sem publicar, e o app mostrava "aguardando
 * posição" mesmo tendo um fix recente.
 */
export const getLastKnownTelemetry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId: string }) => ({
    deviceId: String(input?.deviceId ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<(VehicleTelemetry & { receivedAt: number }) | null> => {
    if (!data.deviceId) return null;
    const { flespiAuthHeaders } = await import("./config.server");
    try {
      const url =
        `https://flespi.io/gw/devices/${encodeURIComponent(data.deviceId)}/messages` +
        `?data=${encodeURIComponent(JSON.stringify({ count: 1, reverse: true }))}`;
      const res = await fetch(url, { headers: flespiAuthHeaders() });
      if (!res.ok) return null;
      const json = (await res.json()) as { result?: unknown[] };
      const msg = json.result?.[0];
      if (!msg) return null;
      const parsed = parseFlespiMessage(JSON.stringify(msg));
      if (!parsed) return null;
      const receivedAt = parsed.timestamp ? parsed.timestamp * 1000 : Date.now();
      return { ...parsed, receivedAt };
    } catch {
      return null;
    }
  });
