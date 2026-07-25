import { useSyncExternalStore } from "react";

/**
 * Estado da viagem "em andamento" (motor ligado) em memória compartilhada
 * entre componentes. Persistido em localStorage para sobreviver a reloads.
 */
export interface TrailPoint {
  lat: number;
  lng: number;
  speed?: number | null;
  t: number;
}

export interface OpenTrip {
  startTime: string; // ISO
  startLat: number | null;
  startLng: number | null;
  mileageAtStart: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastMileage: number | null;
  maxSpeedKmh: number;
  trail: TrailPoint[];
}

const STORAGE_KEY = "openTrip:v2";
const MAX_TRAIL = 500;

function readInitial(): OpenTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenTrip;
    if (!Array.isArray(parsed.trail)) parsed.trail = [];
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
    const trail = current.trail.length >= MAX_TRAIL
      ? [...current.trail.slice(-MAX_TRAIL + 1), pt]
      : [...current.trail, pt];
    this.set({ ...current, trail });
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
