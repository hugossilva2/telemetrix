import { useEffect, useRef, useState } from "react";

/**
 * "Partida segura": depois de o carro ficar parado por mais de 60 minutos,
 * o óleo escorre do topo do motor. Ao ligar, é preciso deixar o motor em
 * marcha lenta (RPM abaixo de 1000) por alguns segundos até o óleo voltar
 * a circular antes de sair.
 */
export const SAFE_START_OFF_THRESHOLD_MS = 60 * 60_000; // 60 min desligado
export const SAFE_START_STABLE_MS = 30_000; // 30s estável abaixo de 1000 rpm
export const SAFE_START_RPM_LIMIT = 1000;

const OFF_SINCE_KEY = "safeStart:offSince:v1";

function readOffSince(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(OFF_SINCE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

function writeOffSince(v: number | null) {
  if (typeof window === "undefined") return;
  if (v == null) window.localStorage.removeItem(OFF_SINCE_KEY);
  else window.localStorage.setItem(OFF_SINCE_KEY, String(v));
}

export type SafeStartPhase =
  | "off" // motor desligado
  | "not-required" // ligou, mas ficou pouco tempo parado
  | "warming" // aquecendo: precisa estabilizar
  | "revving" // rpm acima do limite durante o aquecimento
  | "ready"; // liberado para sair

export interface SafeStartState {
  phase: SafeStartPhase;
  /** 0..1 do tempo de estabilização cumprido */
  progress: number;
  /** segundos restantes até liberar */
  remainingSeconds: number;
  /** minutos que o carro ficou desligado antes desta partida */
  offMinutes: number | null;
  rpm: number | null;
}

export function useSafeStart(
  ignitionOn: boolean | undefined,
  engineRpm: number | undefined,
): SafeStartState {
  const [, setTick] = useState(0);
  const offSince = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const offMinutes = useRef<number | null>(null);
  const required = useRef(false);
  const stableSince = useRef<number | null>(null);
  const ready = useRef(false);
  const prevIgnition = useRef<boolean | undefined>(undefined);

  if (offSince.current === null && typeof window !== "undefined") {
    offSince.current = readOffSince();
  }

  // Tick de 1s para o contador andar sem depender de novas mensagens MQTT.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ignitionOn === undefined) return;
    const prev = prevIgnition.current;
    prevIgnition.current = ignitionOn;

    if (ignitionOn === false) {
      if (offSince.current == null || prev === true) {
        offSince.current = Date.now();
        writeOffSince(offSince.current);
      }
      startedAt.current = null;
      stableSince.current = null;
      ready.current = false;
      required.current = false;
      offMinutes.current = null;
      return;
    }

    // Ignição ON
    if (startedAt.current == null) {
      startedAt.current = Date.now();
      const off = offSince.current;
      const elapsed = off != null ? Date.now() - off : null;
      offMinutes.current = elapsed != null ? Math.floor(elapsed / 60_000) : null;
      required.current = elapsed != null && elapsed >= SAFE_START_OFF_THRESHOLD_MS;
      stableSince.current = null;
      ready.current = false;
      offSince.current = null;
      writeOffSince(null);
    }
  }, [ignitionOn]);

  // Avalia estabilidade do RPM
  useEffect(() => {
    if (ignitionOn !== true || !required.current || ready.current) return;
    if (typeof engineRpm !== "number") return;
    if (engineRpm > 0 && engineRpm < SAFE_START_RPM_LIMIT) {
      if (stableSince.current == null) stableSince.current = Date.now();
    } else if (engineRpm >= SAFE_START_RPM_LIMIT) {
      stableSince.current = null;
    }
  }, [engineRpm, ignitionOn]);

  const rpm = typeof engineRpm === "number" ? engineRpm : null;

  if (ignitionOn !== true) {
    return { phase: "off", progress: 0, remainingSeconds: 0, offMinutes: null, rpm };
  }
  if (!required.current) {
    return {
      phase: "not-required",
      progress: 1,
      remainingSeconds: 0,
      offMinutes: offMinutes.current,
      rpm,
    };
  }

  const elapsedStable = stableSince.current != null ? Date.now() - stableSince.current : 0;
  if (elapsedStable >= SAFE_START_STABLE_MS) ready.current = true;

  if (ready.current) {
    return {
      phase: "ready",
      progress: 1,
      remainingSeconds: 0,
      offMinutes: offMinutes.current,
      rpm,
    };
  }

  const progress = Math.min(1, elapsedStable / SAFE_START_STABLE_MS);
  const remainingSeconds = Math.ceil((SAFE_START_STABLE_MS - elapsedStable) / 1000);

  return {
    phase: stableSince.current == null && rpm != null && rpm >= SAFE_START_RPM_LIMIT
      ? "revving"
      : "warming",
    progress,
    remainingSeconds,
    offMinutes: offMinutes.current,
    rpm,
  };
}
