import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  tripId: string;
  /** Chamado após excluir com sucesso (ex.: voltar para a lista) */
  onDeleted?: () => void;
  variant?: "icon" | "button";
  className?: string;
}

/**
 * Exclui definitivamente uma viagem (e seus eventos de rastreador no intervalo),
 * atualizando listas, relatórios e eco score.
 */
export function DeleteTripButton({ tripId, onDeleted, variant = "icon", className }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const del = useMutation({
    mutationFn: async () => {
      const { data: trip } = await supabase
        .from("trips")
        .select("start_time,end_time")
        .eq("id", tripId)
        .maybeSingle();

      const { error } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;

      // Remove eventos de rastreador do intervalo da viagem (ignição on/off, geofence)
      if (trip?.start_time) {
        const from = trip.start_time;
        const to = trip.end_time ?? trip.start_time;
        await supabase
          .from("tracker_events")
          .delete()
          .gte("occurred_at", from)
          .lte("occurred_at", to);
      }
    },
    onSuccess: () => {
      for (const key of [
        "trips-list",
        "trip",
        "eco-trips",
        "reports",
        "report-trips",
        "driver-scores",
        "tracker-events",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      queryClient.invalidateQueries();
      toast.success("Viagem excluída");
      setOpen(false);
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir a viagem"),
  });

  return (
    <>
      <button
        type="button"
        aria-label="Excluir viagem"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
          variant === "icon" ? "size-8 justify-center" : "px-2.5 py-1 text-xs",
          className,
        )}
      >
        <Trash2 className="size-4 shrink-0" />
        {variant === "button" && <span>Excluir</span>}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta viagem?</AlertDialogTitle>
            <AlertDialogDescription>
              A viagem será removida definitivamente e deixará de contar nos
              relatórios, médias de consumo e eco score. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                del.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
