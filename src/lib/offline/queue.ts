import { useSyncExternalStore } from "react";
import { idb, isIdbAvailable } from "./db";

/** Tipos de operação que podem ficar pendentes offline. */
export type QueuedKind = "trip";

export interface QueuedItem<T = Record<string, unknown>> {
  id: string;
  kind: QueuedKind;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string | null;
  /** Antes deste instante o item não é reenviado (espera progressiva). */
  nextAttemptAt?: number;
}

let cache: QueuedItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function refresh() {
  if (!isIdbAvailable()) return;
  try {
    const all = await idb.all<QueuedItem>();
    cache = all.sort((a, b) => a.createdAt - b.createdAt);
    loaded = true;
    emit();
  } catch {
    /* ignora: fila offline é best-effort */
  }
}

/** Espera progressiva: 5s, 10s, 20s… até 30 minutos. */
export function backoffMs(attempts: number): number {
  const base = 5_000 * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(base, 30 * 60_000);
}

/**
 * Identificador estável: a mesma viagem enfileirada duas vezes (por retomada
 * ou recarregamento) reaproveita a mesma pendência em vez de duplicar.
 */
export function stableId(kind: QueuedKind, payload: Record<string, unknown>): string {
  const parts = [kind, payload["vehicle_id"] ?? "sem-carro", payload["start_time"] ?? ""];
  const key = parts.join("|");
  if (key.endsWith("|")) {
    return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return key;
}

export const offlineQueue = {
  items: () => cache,
  count: () => cache.length,
  ensureLoaded() {
    if (!loaded) void refresh();
  },
  async enqueue<T extends Record<string, unknown>>(kind: QueuedKind, payload: T) {
    const id = stableId(kind, payload);
    const existing = cache.find((i) => i.id === id);
    const item: QueuedItem<T> = {
      id,
      kind,
      payload,
      createdAt: existing?.createdAt ?? Date.now(),
      attempts: existing?.attempts ?? 0,
      nextAttemptAt: existing?.nextAttemptAt ?? 0,
    };
    await idb.put(item);
    await refresh();
    return item.id;
  },
  async remove(id: string) {
    await idb.delete(id);
    await refresh();
  },
  async markFailure(item: QueuedItem, error: string) {
    const attempts = item.attempts + 1;
    await idb.put({
      ...item,
      attempts,
      lastError: error,
      nextAttemptAt: Date.now() + backoffMs(attempts),
    });
    await refresh();
  },
  async clear() {
    await idb.clear();
    await refresh();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    offlineQueue.ensureLoaded();
    return () => {
      listeners.delete(l);
    };
  },
};

/** Lista reativa da fila offline. */
export function useOfflineQueue(): QueuedItem[] {
  return useSyncExternalStore(
    offlineQueue.subscribe,
    () => offlineQueue.items(),
    () => [] as QueuedItem[],
  );
}
