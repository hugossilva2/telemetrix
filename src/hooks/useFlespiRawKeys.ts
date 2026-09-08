import { useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { FLESPI_BROKER_URL, flespiMqttToken, flespiTopics } from "@/lib/flespi/config";
import { useActiveVehicle } from "@/lib/vehicles/active";

export interface RawKeyEntry {
  key: string;
  value: string;
  at: number;
}

export interface UseFlespiRawKeysResult {
  keys: RawKeyEntry[];
  messageCount: number;
  lastMessageAt: number | null;
  connected: boolean;
}

/**
 * Diagnóstico: escuta o device do veículo ativo no MQTT e lista TODAS as
 * chaves recebidas. Sem token de cliente ou sem device, não conecta.
 * Só roda no browser (a conexão é criada dentro do useEffect).
 */
export function useFlespiRawKeys(enabled: boolean): UseFlespiRawKeysResult {
  const { vehicle } = useActiveVehicle();
  const deviceId = vehicle?.flespi_device_id ?? null;
  const [keys, setKeys] = useState<RawKeyEntry[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const token = flespiMqttToken();
    if (!token || !deviceId) return;

    const client = mqtt.connect(FLESPI_BROKER_URL, {
      username: token,
      password: "",
      clean: true,
      keepalive: 30,
      reconnectPeriod: 5000,
      connectTimeout: 15000,
      protocolVersion: 5,
      clientId: `diag-${Math.random().toString(16).slice(2, 10)}`,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      client.subscribe(flespiTopics(deviceId), { qos: 0 });
    });
    client.on("close", () => setConnected(false));
    client.on("offline", () => setConnected(false));

    client.on("message", (_topic, payload) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(payload.toString()) as Record<string, unknown>;
      } catch {
        return;
      }
      const at = Date.now();
      setMessageCount((n) => n + 1);
      setLastMessageAt(at);
      setKeys((prev) => {
        const map = new Map(prev.map((k) => [k.key, k]));
        for (const [key, value] of Object.entries(data)) {
          map.set(key, { key, value: String(value), at });
        }
        return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
      });
    });

    return () => {
      client.end(true);
      clientRef.current = null;
      setConnected(false);
    };
  }, [enabled, deviceId]);

  return { keys, messageCount, lastMessageAt, connected };
}
