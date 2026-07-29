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

export const offlineQueue = {
  items: () => cache,
  count: () => cache.length,
  ensureLoaded() {
    if (!loaded) void refresh();
  },
  async enqueue<T extends Record<string, unknown>>(kind: QueuedKind, payload: T) {
    const item: QueuedItem<T> = {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      payload,
      createdAt: Date.now(),
      attempts: 0,
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
    await idb.put({ ...item, attempts: item.attempts + 1, lastError: error });
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

/** Quantidade de itens aguardando sincronização. */
export function useOfflineQueueCount(): number {
  return useSyncExternalStore(
    offlineQueue.subscribe,
    () => offlineQueue.count(),
    () => 0,
  );
}

/** Lista reativa da fila offline. */
export function useOfflineQueue(): QueuedItem[] {
  return useSyncExternalStore(
    offlineQueue.subscribe,
    () => offlineQueue.items(),
    () => [] as QueuedItem[],
  );
}
