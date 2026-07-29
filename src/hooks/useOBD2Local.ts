import { useCallback, useEffect, useRef, useState } from "react";
import { Elm327Client, isWebBluetoothSupported } from "@/lib/obd/elm327";
import { obdDeviceStore, type SavedObdDevice } from "@/lib/obd/device";
import {
  FAST_PIDS,
  SLOW_PIDS,
  PID_MAF,
  fuelRateLph,
  parsePidResponse,
} from "@/lib/obd/pids";
import type { VehicleTelemetry } from "@/lib/flespi/types";
import type { TelemetryStatus } from "@/lib/telemetry/types";

export interface UseOBD2LocalResult {
  status: TelemetryStatus;
  telemetry: VehicleTelemetry;
  lastMessageAt: number | null;
  error: string | null;
  supported: boolean;
  deviceName: string | null;
  /** Adaptador memorizado de pareamentos anteriores (localStorage). */
  savedDevice: SavedObdDevice | null;
  forgetDevice: () => void;
  /** Consumo instantâneo estimado (L/h), quando há MAF ou estimativa. */
  fuelLph: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}


const POLL_INTERVAL_MS = 500;
const IGNITION_RPM_THRESHOLD = 300;

/**
 * Modo Econômico: lê o motor via adaptador ELM327 (Web Bluetooth) e a posição
 * via GPS do celular (`navigator.geolocation.watchPosition`), fundindo os dois
 * no mesmo formato de telemetria usado pelo modo nuvem.
 */
export function useOBD2Local(enabled: boolean): UseOBD2LocalResult {
  const [status, setStatus] = useState<TelemetryStatus>("idle");
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [fuelLph, setFuelLph] = useState<number | null>(null);
  const [savedDevice, setSavedDevice] = useState<SavedObdDevice | null>(null);

  useEffect(() => {
    setSavedDevice(obdDeviceStore.get());
    return obdDeviceStore.subscribe(setSavedDevice);
  }, []);

  const forgetDevice = useCallback(() => obdDeviceStore.forget(), []);


  const clientRef = useRef<Elm327Client | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowIndex = useRef(0);
  const busy = useRef(false);

  const supported = isWebBluetoothSupported();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const patch = useCallback((next: Partial<VehicleTelemetry>) => {
    setTelemetry((prev) => ({ ...prev, ...next }));
    setLastMessageAt(Date.now());
  }, []);

  /** Um ciclo de polling: PIDs rápidos + um lento por volta. */
  const pollOnce = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !client.connected || busy.current) return;
    busy.current = true;
    try {
      const specs = [...FAST_PIDS, SLOW_PIDS[slowIndex.current % SLOW_PIDS.length]];
      slowIndex.current += 1;
      const next: Partial<VehicleTelemetry> = {};

      for (const spec of specs) {
        let raw: string;
        try {
          raw = await client.send(spec.cmd, 2500);
        } catch {
          continue;
        }
        const bytes = parsePidResponse(raw, spec.pid);
        if (!bytes) continue;
        const value = spec.decode(bytes);
        if (value === undefined || Number.isNaN(value)) continue;

        switch (spec.pid) {
          case "0C":
            next.engineRpm = Math.round(value);
            next.ignitionOn = value > IGNITION_RPM_THRESHOLD;
            break;
          case "0D":
            next.speedKmh = Math.round(value);
            next.canSpeedKmh = Math.round(value);
            break;
          case "04":
            next.engineLoad = Math.round(value);
            break;
          case "2F":
            next.fuelLevel = Math.round(value);
            break;
          case "42":
            next.batteryVoltage = Number(value.toFixed(2));
            break;
          case PID_MAF.pid:
            setFuelLph(Number(fuelRateLph(value).toFixed(2)));
            break;
          default:
            break;
        }
      }

      if (Object.keys(next).length > 0) {
        next.timestamp = Math.floor(Date.now() / 1000);
        patch(next);
      }
    } finally {
      busy.current = false;
    }
  }, [patch]);

  const disconnect = useCallback(() => {
    stopPolling();
    clientRef.current?.disconnect();
    clientRef.current = null;
    setDeviceName(null);
    setStatus("offline");
  }, [stopPolling]);

  const connect = useCallback(async () => {
    if (!supported) {
      setError("Web Bluetooth não é suportado neste navegador (use o Chrome no Android).");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("connecting");
    const client = new Elm327Client({
      onStatus: (s) => {
        if (s === "connected") setStatus("connected");
        if (s === "disconnected") {
          stopPolling();
          setStatus("offline");
        }
        if (s === "error") setStatus("error");
      },
      onError: (m) => setError(m),
    });
    clientRef.current = client;
    try {
      await client.connect();
      setDeviceName(client.deviceName);
      setStatus("connected");
      stopPolling();
      pollRef.current = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    } catch (e) {
      const msg = (e as Error).message || "Falha ao conectar no adaptador.";
      setError(msg);
      setStatus(/cancel|User cancelled|chooser/i.test(msg) ? "offline" : "error");
      clientRef.current = null;
    }
  }, [pollOnce, stopPolling, supported]);

  // GPS do celular: posição, velocidade e rumo enquanto o modo estiver ativo.
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const gpsSpeed =
          typeof pos.coords.speed === "number" && pos.coords.speed >= 0
            ? pos.coords.speed * 3.6
            : undefined;
        setTelemetry((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          positionValid: true,
          headingDeg:
            typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)
              ? pos.coords.heading
              : prev.headingDeg,
          // Velocidade do CAN tem prioridade; GPS é fallback.
          speedKmh: prev.canSpeedKmh ?? (gpsSpeed !== undefined ? Math.round(gpsSpeed) : prev.speedKmh),
        }));
        setLastMessageAt(Date.now());
      },
      (err) => setError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  // Desliga tudo ao sair do modo econômico.
  useEffect(() => {
    if (enabled) return;
    stopPolling();
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("idle");
  }, [enabled, stopPolling]);

  useEffect(
    () => () => {
      stopPolling();
      clientRef.current?.disconnect();
      clientRef.current = null;
    },
    [stopPolling],
  );

  return {
    status,
    telemetry,
    lastMessageAt,
    error,
    supported,
    deviceName,
    savedDevice,
    forgetDevice,

    connect,
    disconnect,
  };
}
