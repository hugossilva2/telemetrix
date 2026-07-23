import { useSyncExternalStore } from "react";

/**
 * Estado da viagem "em andamento" (motor ligado) em memória compartilhada
 * entre componentes. Persistido em localStorage para sobreviver a reloads.
 */
export interface OpenTrip {
  startTime: string; // ISO
  startLat: number | null;
  startLng: number | null;
  mileageAtStart: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastMileage: number | null;
  maxSpeedKmh: number;
}

const STORAGE_KEY = "openTrip:v1";

function readInitial(): OpenTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OpenTrip) : null;
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
