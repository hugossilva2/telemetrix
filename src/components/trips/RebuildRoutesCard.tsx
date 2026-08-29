import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPinned, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/errors/userMessage";
import {
  countTripsWithoutRoute,
  rebuildTripRoutes,
} from "@/lib/trips/rebuildRoutes.functions";

/** Reconstrói o traçado real das viagens antigas a partir dos pings gravados. */
export function RebuildRoutesCard() {
  const queryClient = useQueryClient();
  const count = useServerFn(countTripsWithoutRoute);
  const rebuild = useServerFn(rebuildTripRoutes);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  const { data, refetch } = useQuery({
    queryKey: ["trips-without-route"],
    queryFn: () => count(),
    staleTime: 60_000,
  });

  const pending = data?.pending ?? 0;

  async function handleRun() {
    setRunning(true);
    setDone(0);
    let processedTotal = 0;
    let snappedTotal = 0;
    try {
      for (let round = 0; round < 40; round++) {
        const res = await rebuild({ data: { days: 30, limit: 8 } });
        processedTotal += res.processed;
        snappedTotal += res.snapped;
        setDone(processedTotal);
        if (res.remaining === 0 || res.processed + res.skipped === 0) break;
      }
      toast.success("Traçados reconstruídos", {
        description: `${processedTotal} viagem(ns) atualizadas · ${snappedTotal} encaixadas nas ruas.`,
      });
    } catch (err) {
      toast.error("Não foi possível reconstruir os traçados", {
        description: toUserMessage(err, "Tente novamente em alguns minutos."),
      });
    } finally {
      setRunning(false);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["trips-list"] });
    }
  }

  return (
    <section className="card-surface p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <MapPinned className="size-4" /> Traçado das viagens
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {pending > 0
          ? `${pending} viagem(ns) dos últimos 30 dias ainda aparecem como linha reta no mapa. Podemos reconstruir o caminho real usando as posições gravadas.`
          : "Todas as viagens dos últimos 30 dias já têm o caminho real gravado."}
      </p>
      {running && (
        <p className="mt-2 text-xs text-primary">
          Reconstruindo… {done} viagem(ns) concluídas.
        </p>
      )}
      <Button
        className="mt-3"
        size="sm"
        variant="secondary"
        disabled={running || pending === 0}
        onClick={handleRun}
      >
        <RefreshCw className={running ? "size-4 animate-spin" : "size-4"} />
        {running ? "Reconstruindo…" : "Reconstruir traçados"}
      </Button>
    </section>
  );
}
