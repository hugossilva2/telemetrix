import { FLESPI_CONFIG } from "./config";
import { parseFlespiMessage } from "./parse";
import type { VehicleTelemetry } from "./types";

/**
 * Busca a última mensagem do device via REST da Flespi.
 *
 * O MQTT só entrega mensagens novas: com o carro parado/dormindo o rastreador
 * pode ficar minutos sem publicar, e o app abria "aguardando posição" mesmo
 * tendo um fix recente. Esse seed inicial resolve isso.
 */
export async function fetchLastKnownTelemetry(): Promise<
  (VehicleTelemetry & { receivedAt: number }) | null
> {
  try {
    const url =
      `https://flespi.io/gw/devices/${FLESPI_CONFIG.deviceId}/messages` +
      `?data=${encodeURIComponent(JSON.stringify({ count: 1, reverse: true }))}`;
    const res = await fetch(url, {
      headers: { Authorization: `FlespiToken ${FLESPI_CONFIG.token}` },
    });
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
}
