import { useState, type ReactNode } from "react";
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
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { tripDestinationStore, type TripDestination } from "@/lib/trips/activeDestination";

interface StartTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: {
    id: string;
    name: string;
    icon?: string | null;
    lat: number;
    lng: number;
    geofence_radius_m?: number | null;
  } | null;
  etaInfo?: ReactNode;
}

export function StartTripDialog({ open, onOpenChange, place, etaInfo }: StartTripDialogProps) {
  const { telemetry } = useFlespiMqtt();
  const ignitionOn = telemetry.ignitionOn === true;

  const handleStart = () => {
    if (!place) return;
    const dest: TripDestination = {
      placeId: place.id,
      name: place.name,
      icon: place.icon ?? null,
      lat: place.lat,
      lng: place.lng,
      radiusM: place.geofence_radius_m ?? 150,
      startedAt: new Date().toISOString(),
    };
    if (ignitionOn) {
      tripDestinationStore.setActive(dest);
      toast.success(`Viagem iniciada — monitorando até ${place.name}`);
    } else {
      tripDestinationStore.setPending(dest);
      toast.message("Motor desligado", {
        description: `A viagem para ${place.name} começará ao ligar o carro.`,
      });
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ir para {place?.name ?? ""}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {etaInfo}
              <p
                className={
                  ignitionOn
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }
              >
                {ignitionOn
                  ? "Motor ligado — a viagem será monitorada agora."
                  : "Motor desligado — a viagem começará ao ligar o carro."}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleStart}>
            {ignitionOn ? "Iniciar viagem" : "Programar viagem"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Hook helper to control the dialog with a selected place. */
export function useStartTripDialog() {
  const [place, setPlace] = useState<StartTripDialogProps["place"]>(null);
  return {
    place,
    open: place !== null,
    openFor: (p: StartTripDialogProps["place"]) => setPlace(p),
    close: () => setPlace(null),
  };
}
