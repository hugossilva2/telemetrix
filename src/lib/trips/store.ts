import { useSyncExternalStore } from "react";
import type { EcoEvent } from "@/lib/eco/detect";

/**
 * Estado da viagem "em andamento" (motor ligado) em memória compartilhada
 * entre componentes. Persistido em localStorage para sobreviver a reloads.
 */
export interface TrailPoint {
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  rpm?: number | null;
  load?: number | null;
  t: number;
}

/** Dono/carro/origem aos quais a viagem em andamento pertence. */
export interface TripContext {
  ownerId: string | null;
  vehicleId: string | null;
  source: string | null;
}

export interface OpenTrip extends TripContext {
  startTime: string; // ISO
  startLat: number | null;
  startLng: number | null;
  mileageAtStart: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastMileage: number | null;
  maxSpeedKmh: number;
  trail: TrailPoint[];
  /** Eventos de direção agressiva acumulados durante a viagem */
  ecoEvents: EcoEvent[];
  /** Segundos parado com motor ligado */
  idleSeconds: number;
}

/**
 * A viagem só pode continuar se pertencer à mesma conta, ao mesmo carro e à
 * mesma origem de dados. Contexto ainda desconhecido (null) não invalida.
 */
export function matchesTripContext(trip: TripContext, ctx: Partial<TripContext>): boolean {
  const same = (a: string | null | undefined, b: string | null | undefined) =>
    a == null || b == null || a === b;
  return (
    same(trip.ownerId, ctx.ownerId) &&
    same(trip.vehicleId, ctx.vehicleId) &&
    same(trip.source, ctx.source)
  );
}

const STORAGE_KEY = "openTrip:v3";
const MAX_TRAIL = 500;
const MAX_EVENTS = 300;

function readInitial(): OpenTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenTrip;
    if (!Array.isArray(parsed.trail)) parsed.trail = [];
    if (!Array.isArray(parsed.ecoEvents)) parsed.ecoEvents = [];
    if (typeof parsed.idleSeconds !== "number") parsed.idleSeconds = 0;
    if (parsed.ownerId === undefined) parsed.ownerId = null;
    if (parsed.vehicleId === undefined) parsed.vehicleId = null;
    if (parsed.source === undefined) parsed.source = null;
    return parsed;
  } catch {
    return null;
  }
}

let current: OpenTrip | null = readInitial();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const tripStore = {
  get(): OpenTrip | null {
    return current;
  },
  set(next: OpenTrip | null) {
    current = next;
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    emit();
  },
  appendTrail(pt: TrailPoint) {
    if (!current) return;
    const trail =
      current.trail.length >= MAX_TRAIL
        ? [...current.trail.slice(-MAX_TRAIL + 1), pt]
        : [...current.trail, pt];
    this.set({ ...current, trail });
  },
  appendEcoEvents(events: EcoEvent[], extraIdleSeconds = 0) {
    if (!current) return;
    if (events.length === 0 && extraIdleSeconds <= 0) return;
    const merged = [...current.ecoEvents, ...events];
    this.set({
      ...current,
      ecoEvents: merged.length > MAX_EVENTS ? merged.slice(-MAX_EVENTS) : merged,
      idleSeconds: current.idleSeconds + Math.max(0, extraIdleSeconds),
    });
  },

  /**
   * Garante que a viagem guardada pertence ao contexto atual (conta, carro e
   * origem). Se não pertencer, descarta — nunca reaproveita a viagem anterior.
   * Se pertencer e ainda faltar contexto, completa os campos.
   */
  ensureContext(ctx: Partial<TripContext>): OpenTrip | null {
    if (!current) return null;
    if (!matchesTripContext(current, ctx)) {
      this.set(null);
      return null;
    }
    const filled: OpenTrip = {
      ...current,
      ownerId: current.ownerId ?? ctx.ownerId ?? null,
      vehicleId: current.vehicleId ?? ctx.vehicleId ?? null,
      source: current.source ?? ctx.source ?? null,
    };
    if (
      filled.ownerId !== current.ownerId ||
      filled.vehicleId !== current.vehicleId ||
      filled.source !== current.source
    ) {
      this.set(filled);
    }
    return current;
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useOpenTrip(): OpenTrip | null {
  return useSyncExternalStore(
    tripStore.subscribe,
    () => tripStore.get(),
    () => null,
  );
}
