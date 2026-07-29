import { useState } from "react";
import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineQueue, offlineQueue } from "@/lib/offline/queue";
import { flushOfflineQueue } from "@/lib/offline/sync";

/** Mostra e gerencia os registros que aguardam envio ao servidor. */
export function OfflineQueueCard() {
  const items = useOfflineQueue();
  const [busy, setBusy] = useState(false);

  const sync = async () => {
    setBusy(true);
    try {
      const { synced, failed } = await flushOfflineQueue();
      if (synced > 0) toast.success(`${synced} registro(s) enviados`);
      if (synced === 0 && failed === 0) toast.info("Nada pendente para enviar");
      if (failed > 0) toast.warning(`${failed} registro(s) ainda pendentes`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-surface p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CloudOff className="size-4 text-primary" />
          Sincronização offline
        </div>
        <Badge variant={items.length > 0 ? "secondary" : "outline"}>
          {items.length} pendente{items.length === 1 ? "" : "s"}
        </Badge>
      </header>

      <p className="text-xs text-muted-foreground">
        Viagens gravadas sem internet ficam salvas no aparelho e são enviadas
        automaticamente quando a conexão volta.
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {items.slice(0, 5).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2">
              <span>Viagem de {new Date(it.createdAt).toLocaleString("pt-BR")}</span>
              {it.attempts > 0 && <span className="text-warning">{it.attempts} tentativa(s)</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={sync} disabled={busy}>
          <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
          Sincronizar agora
        </Button>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void offlineQueue.clear().then(() => toast.success("Fila limpa"))}
          >
            <Trash2 className="size-4" />
            Limpar
          </Button>
        )}
      </div>
    </section>
  );
}
