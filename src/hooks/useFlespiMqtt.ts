import { useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { FLESPI_CONFIG, FLESPI_TOPIC } from "@/lib/flespi/config";
import { mergeTelemetry, parseFlespiMessage, parseFlespiStateTopic } from "@/lib/flespi/parse";
import { fetchLastKnownTelemetry } from "@/lib/flespi/lastKnown";

import type { MqttStatus, VehicleTelemetry } from "@/lib/flespi/types";

export interface UseFlespiMqttResult {
  status: MqttStatus;
  telemetry: VehicleTelemetry;
  lastMessageAt: number | null;
  error: string | null;
}

/**
 * Conecta ao broker MQTT do Flespi via WebSocket e escuta a telemetria do
 * device configurado. Reconexão automática com backoff exponencial é gerida
 * pela própria biblioteca `mqtt` (reconnectPeriod).
 *
 * Somente executa no browser — retorna estado inicial no SSR.
 */
export function useFlespiMqtt(): UseFlespiMqttResult {
  const [status, setStatus] = useState<MqttStatus>("idle");
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  // Seed inicial: última mensagem conhecida via REST, para não ficar
  // "aguardando posição" enquanto o rastreador está parado/dormindo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    fetchLastKnownTelemetry().then((last) => {
      if (cancelled || !last) return;
      const { receivedAt, ...tele } = last;
      setTelemetry((prev) => mergeTelemetry(tele, prev));
      setLastMessageAt((prev) => prev ?? receivedAt);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setStatus("connecting");
    let reconnectDelay = 1000;
    const maxDelay = 30000;


    const client = mqtt.connect(FLESPI_CONFIG.brokerUrl, {
      username: FLESPI_CONFIG.token,
      password: "",
      clean: true,
      keepalive: 30,
      reconnectPeriod: reconnectDelay,
      connectTimeout: 15000,
      protocolVersion: 5,
      clientId: `veh-${Math.random().toString(16).slice(2, 10)}`,
    });
    clientRef.current = client;

    client.on("connect", () => {
      reconnectDelay = 1000;
      client.options.reconnectPeriod = reconnectDelay;
      setStatus("connected");
      setError(null);
      // Assina o tópico configurado + variantes conhecidas do Flespi
      // (message tem ou não sufixo, e state/telemetry publica em outro caminho).
      const topics = [
        FLESPI_TOPIC,
        `flespi/message/gw/devices/${FLESPI_CONFIG.deviceId}`,
        `flespi/state/gw/devices/${FLESPI_CONFIG.deviceId}/telemetry/#`,
      ];
      client.subscribe(topics, { qos: 0 }, (err, granted) => {
        if (err) {
          setError(`Falha ao inscrever: ${err.message}`);
          console.warn("[flespi] subscribe error", err);
        } else {
          console.log("[flespi] subscribed", granted);
        }
      });
    });

    client.on("reconnect", () => {
      setStatus("reconnecting");
      reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
      client.options.reconnectPeriod = reconnectDelay;
    });

    client.on("offline", () => setStatus("offline"));
    client.on("close", () => setStatus((s) => (s === "connected" ? "offline" : s)));

    client.on("error", (err) => {
      setStatus("error");
      setError(err.message);
      console.warn("[flespi] error", err);
    });

    client.on("message", (topic, payload) => {
      const raw = payload.toString();
      console.log("[flespi] message", topic, raw.slice(0, 200));
      const parsed = topic.includes("/telemetry/")
        ? parseFlespiStateTopic(topic, raw)
        : parseFlespiMessage(raw);
      if (!parsed) return;
      setLastMessageAt(Date.now());
      setTelemetry((prev) => mergeTelemetry(prev, parsed));
    });

    return () => {
      client.end(true);
      clientRef.current = null;
    };
  }, []);

  return { status, telemetry, lastMessageAt, error };
}
