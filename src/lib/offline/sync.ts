import { supabase } from "@/integrations/supabase/client";
import { offlineQueue, type QueuedItem } from "./queue";

/** Erros que nunca vão passar: descartar em vez de tentar para sempre. */
const PERMANENT_CODES = new Set([
  "22P02", // valor inválido
  "23502", // campo obrigatório ausente
  "23503", // referência inexistente
  "23514", // regra de coerência violada
  "42501", // sem permissão
]);

/** Já existe no histórico: contar como enviado. */
const DUPLICATE_CODE = "23505";

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function isPermanentError(code?: string | null): boolean {
  return !!code && PERMANENT_CODES.has(code);
}

async function pushItem(item: QueuedItem): Promise<boolean> {
  if (item.kind !== "trip") return true;
  const { error } = await supabase.from("trips").insert(item.payload as never);
  if (!error) return true;
  const code = (error as { code?: string }).code;
  // Viagem já gravada (webhook do rastreador): pendência cumprida.
  if (code === DUPLICATE_CODE) return true;
  if (isPermanentError(code)) {
    await offlineQueue.remove(item.id);
    console.error("[offline] pendência descartada por erro definitivo:", error.message);
    return false;
  }
  // Erro temporário (rede, servidor): mantém na fila com espera progressiva.
  await offlineQueue.markFailure(item, error.message);
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
    const now = Date.now();
    const items = [...offlineQueue.items()].filter((i) => (i.nextAttemptAt ?? 0) <= now);
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

let running = false;
let lastResult: { synced: number; failed: number; at: number } | null = null;
export function lastSyncResult() {
  return lastResult;
}
