import { useSyncExternalStore } from "react";

/**
 * Destino ativo/pendente da viagem em curso.
 * - active: viagem já iniciada (motor ligado no momento do toque OU promovido de pending).
 * - pending: usuário escolheu destino mas o motor estava desligado; será promovido quando ligar.
 *
 * Persistido em localStorage, sem tocar no banco.
 */

export interface TripDestination {
  placeId: string;
  name: string;
  icon?: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  startedAt: string; // ISO
}

const ACTIVE_KEY = "tripDestination:active:v1";
const PENDING_KEY = "tripDestination:pending:v1";

type Snapshot = {
  active: TripDestination | null;
  pending: TripDestination | null;
};

function safeRead(key: string): TripDestination | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TripDestination;
  } catch {
    return null;
  }
}

let snapshot: Snapshot = {
  active: safeRead(ACTIVE_KEY),
  pending: safeRead(PENDING_KEY),
};

const listeners = new Set<() => void>();
function emit() {
  // Copiar objeto para invalidar referência do useSyncExternalStore
  snapshot = { ...snapshot };
  listeners.forEach((l) => l());
}

function write(key: string, value: TripDestination | null) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, JSON.stringify(value));
  else window.localStorage.removeItem(key);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === ACTIVE_KEY) {
      snapshot.active = safeRead(ACTIVE_KEY);
      emit();
    } else if (e.key === PENDING_KEY) {
      snapshot.pending = safeRead(PENDING_KEY);
      emit();
    }
  });
}

export const tripDestinationStore = {
  getActive(): TripDestination | null {
    return snapshot.active;
  },
  getPending(): TripDestination | null {
    return snapshot.pending;
  },
  setActive(d: TripDestination | null) {
    snapshot.active = d;
    write(ACTIVE_KEY, d);
    emit();
  },
  setPending(d: TripDestination | null) {
    snapshot.pending = d;
    write(PENDING_KEY, d);
    emit();
  },
  clearAll() {
    snapshot.active = null;
    snapshot.pending = null;
    write(ACTIVE_KEY, null);
    write(PENDING_KEY, null);
    emit();
  },
  promotePending(): TripDestination | null {
    const p = snapshot.pending;
    if (!p) return null;
    const promoted: TripDestination = { ...p, startedAt: new Date().toISOString() };
    snapshot.pending = null;
    snapshot.active = promoted;
    write(PENDING_KEY, null);
    write(ACTIVE_KEY, promoted);
    emit();
    return promoted;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): Snapshot {
    return snapshot;
  },
};

export function useTripDestination(): Snapshot {
  return useSyncExternalStore(
    tripDestinationStore.subscribe,
    tripDestinationStore.getSnapshot,
    () => ({ active: null, pending: null }),
  );
}
