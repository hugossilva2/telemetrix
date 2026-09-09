import { useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { FLESPI_BROKER_URL, flespiMqttToken, flespiTopics } from "@/lib/flespi/config";
import { mergeTelemetry, parseFlespiMessage, parseFlespiStateTopic } from "@/lib/flespi/parse";
import { fetchLastKnownTelemetry } from "@/lib/flespi/lastKnown";
import { useActiveVehicle } from "@/lib/vehicles/active";

import type { MqttStatus, VehicleTelemetry } from "@/lib/flespi/types";

export interface UseFlespiMqttResult {
  status: MqttStatus;
  telemetry: VehicleTelemetry;
  lastMessageAt: number | null;
  error: string | null;
}

/**
 * Conecta ao broker MQTT do Flespi via WebSocket e escuta a telemetria do
 * device do veículo ativo (`vehicles.flespi_device_id`). Reconexão automática
 * com backoff exponencial é gerida pela própria biblioteca `mqtt`.
 *
 * Sem token de cliente (`VITE_FLESPI_MQTT_TOKEN`) ou sem device configurado,
 * degrada em silêncio: não conecta e o app segue com o polling do servidor.
 * Somente executa no browser — retorna estado inicial no SSR.
 */
export function useFlespiMqtt(): UseFlespiMqttResult {
  const { vehicle } = useActiveVehicle();
  const deviceId = vehicle?.flespi_device_id ?? null;
  const [status, setStatus] = useState<MqttStatus>("idle");
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  // Seed inicial: última mensagem conhecida via servidor, para não ficar
  // "aguardando posição" enquanto o rastreador está parado/dormindo.
  useEffect(() => {
    if (typeof window === "undefined" || !vehicleId || !deviceId) return;
    let cancelled = false;
    // Troca de veículo/conta: limpa a telemetria anterior para não misturar
    // odômetro e posição de um carro com os do outro.
    setTelemetry({});
    setLastMessageAt(null);
    fetchLastKnownTelemetry(vehicleId).then((last) => {
      if (cancelled || !last) return;
      const { receivedAt, ...tele } = last;
      setTelemetry((prev) => mergeTelemetry(tele, prev));
      setLastMessageAt((prev) => prev ?? receivedAt);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, deviceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = flespiMqttToken();
    if (!token || !deviceId) {
      // Degradação silenciosa: o rastreamento continua pelo polling.
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    let reconnectDelay = 1000;
    const maxDelay = 30000;

    const client = mqtt.connect(FLESPI_BROKER_URL, {
      username: token,
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
      client.subscribe(flespiTopics(deviceId), { qos: 0 }, (err) => {
        if (err) {
          setError(`Falha ao inscrever: ${err.message}`);
          console.warn("[flespi] subscribe error", err);
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
  }, [deviceId]);

  return { status, telemetry, lastMessageAt, error };
}
