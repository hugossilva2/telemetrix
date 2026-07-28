import { useEffect, useRef, useState } from "react";
import { upsertSafeStartEntry } from "./safeStartHistory";

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
const SESSION_KEY = "safeStart:session:v1";

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

/** Sessão de partida em andamento — sobrevive a reload / reabertura do PWA. */
interface SafeStartSession {
  startedAt: number | null;
  offMinutes: number | null;
  required: boolean;
  stableSince: number | null;
  ready: boolean;
  lastRpm: number | null;
  minRpm?: number | null;
  readyAt?: number | null;
}

function readSession(): SafeStartSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SafeStartSession;
    if (typeof s !== "object" || s == null) return null;
    return s;
  } catch {
    return null;
  }
}

function writeSession(s: SafeStartSession | null) {
  if (typeof window === "undefined") return;
  if (s == null) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
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
  const lastRpm = useRef<number | null>(null);
  const minRpm = useRef<number | null>(null);
  const readyAt = useRef<number | null>(null);
  const prevIgnition = useRef<boolean | undefined>(undefined);
  const hydrated = useRef(false);

  // Restaura o estado salvo (reload da página / reabertura do PWA).
  if (!hydrated.current && typeof window !== "undefined") {
    hydrated.current = true;
    offSince.current = readOffSince();
    const s = readSession();
    if (s) {
      startedAt.current = s.startedAt ?? null;
      offMinutes.current = s.offMinutes ?? null;
      required.current = !!s.required;
      stableSince.current = s.stableSince ?? null;
      ready.current = !!s.ready;
      lastRpm.current = s.lastRpm ?? null;
      minRpm.current = s.minRpm ?? null;
      readyAt.current = s.readyAt ?? null;
    }
  }

  const persist = () => {
    if (startedAt.current == null) {
      writeSession(null);
      return;
    }
    writeSession({
      startedAt: startedAt.current,
      offMinutes: offMinutes.current,
      required: required.current,
      stableSince: stableSince.current,
      ready: ready.current,
      lastRpm: lastRpm.current,
    });
  };

  const logHistory = () => {
    if (startedAt.current == null) return;
    upsertSafeStartEntry({
      id: startedAt.current,
      startedAt: startedAt.current,
      offMinutes: offMinutes.current,
      minRpm: minRpm.current,
      required: required.current,
      ready: ready.current,
      readyAt: readyAt.current,
    });
  };

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
      if (offSince.current == null || prev === true || startedAt.current != null) {
        offSince.current = Date.now();
        writeOffSince(offSince.current);
      }
      logHistory();
      startedAt.current = null;
      stableSince.current = null;
      ready.current = false;
      required.current = false;
      offMinutes.current = null;
      lastRpm.current = null;
      minRpm.current = null;
      readyAt.current = null;
      persist();
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
      minRpm.current = null;
      readyAt.current = null;
      offSince.current = null;
      writeOffSince(null);
      persist();
      logHistory();
    }
  }, [ignitionOn]);

  // Avalia estabilidade do RPM
  useEffect(() => {
    if (typeof engineRpm === "number") {
      lastRpm.current = engineRpm;
      if (
        ignitionOn === true &&
        engineRpm > 0 &&
        (minRpm.current == null || engineRpm < minRpm.current)
      ) {
        minRpm.current = engineRpm;
      }
    }
    if (ignitionOn !== true || !required.current || ready.current) return;
    if (typeof engineRpm !== "number") return;
    if (engineRpm > 0 && engineRpm < SAFE_START_RPM_LIMIT) {
      if (stableSince.current == null) stableSince.current = Date.now();
    } else if (engineRpm >= SAFE_START_RPM_LIMIT) {
      stableSince.current = null;
    }
    persist();
    logHistory();
  }, [engineRpm, ignitionOn]);

  const rpm = typeof engineRpm === "number" ? engineRpm : lastRpm.current;

  if (ignitionOn !== true && startedAt.current == null) {
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
  if (elapsedStable >= SAFE_START_STABLE_MS && !ready.current) {
    ready.current = true;
    persist();
  }

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
