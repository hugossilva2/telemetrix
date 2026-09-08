/**
 * Configuração do cliente MQTT (browser).
 *
 * Nenhum token literal vive neste arquivo. O cliente usa
 * `VITE_FLESPI_MQTT_TOKEN` — um token separado, de escopo restrito (somente
 * leitura MQTT), já que qualquer valor `VITE_*` é visível no bundle.
 * O token com permissão na REST API é exclusivo do servidor
 * (`process.env.FLESPI_TOKEN`, ver `config.server.ts`).
 */
export const FLESPI_BROKER_URL = "wss://mqtt.flespi.io:443";

/** Token de leitura MQTT do browser, ou `null` se não configurado. */
export function flespiMqttToken(): string | null {
  const raw = import.meta.env.VITE_FLESPI_MQTT_TOKEN as string | undefined;
  const token = typeof raw === "string" ? raw.trim() : "";
  return token.length > 0 ? token : null;
}

/**
 * Tópicos do device. `#` casa o tópico do device e qualquer subtópico: alguns
 * fluxos publicam em `flespi/message/gw/devices/{id}` (sem segmento extra) e
 * outros em `.../{id}/xxx`.
 */
export function flespiTopics(deviceId: string): string[] {
  return [
    `flespi/message/gw/devices/${deviceId}/#`,
    `flespi/message/gw/devices/${deviceId}`,
    `flespi/state/gw/devices/${deviceId}/telemetry/#`,
  ];
}
