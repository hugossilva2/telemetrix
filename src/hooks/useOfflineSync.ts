import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { offlineQueue } from "@/lib/offline/queue";
import { flushOfflineQueue } from "@/lib/offline/sync";

const RETRY_INTERVAL_MS = 60_000;

/**
 * Sincronização offline-first: tenta enviar a fila do IndexedDB ao voltar a
 * conexão, ao abrir o app e periodicamente enquanto ele estiver aberto.
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    offlineQueue.ensureLoaded();
    let cancelled = false;

    const run = async () => {
      if (offlineQueue.count() === 0) return;
      const { synced } = await flushOfflineQueue();
      if (cancelled || synced === 0) return;
      toast.success(
        synced === 1 ? "1 registro offline sincronizado" : `${synced} registros offline sincronizados`,
      );
      queryClient.invalidateQueries({ queryKey: ["trips-list"] });
    };

    const timer = setInterval(() => void run(), RETRY_INTERVAL_MS);
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    const boot = setTimeout(() => void run(), 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(boot);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);
}
