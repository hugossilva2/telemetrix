import { supabase } from "@/integrations/supabase/client";
import { offlineQueue, type QueuedItem } from "./queue";

const MAX_ATTEMPTS = 8;

let running = false;
let lastResult: { synced: number; failed: number; at: number } | null = null;

export function getLastSyncResult() {
  return lastResult;
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

async function pushItem(item: QueuedItem): Promise<boolean> {
  if (item.kind !== "trip") return true;
  const { error } = await supabase
    .from("trips")
    .insert(item.payload as never);
  if (!error) return true;
  // Erros de validação/permite descarte após muitas tentativas
  await offlineQueue.markFailure(item, error.message);
  if (item.attempts + 1 >= MAX_ATTEMPTS) {
    await offlineQueue.remove(item.id);
  }
  return false;
}

/** Envia em lote tudo que está pendente. Seguro para chamar várias vezes. */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (running || !isOnline()) return { synced: 0, failed: 0 };
  running = true;
  let synced = 0;
  let failed = 0;
  try {
    offlineQueue.ensureLoaded();
    const items = [...offlineQueue.items()];
    for (const item of items) {
      try {
        const ok = await pushItem(item);
        if (ok) {
          await offlineQueue.remove(item.id);
          synced += 1;
        } else {
          failed += 1;
        }
      } catch (e) {
        failed += 1;
        await offlineQueue.markFailure(item, (e as Error).message);
      }
    }
  } finally {
    running = false;
    lastResult = { synced, failed, at: Date.now() };
  }
  return { synced, failed };
}
