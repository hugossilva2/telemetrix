import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { tripStore, type OpenTrip, type TrailPoint } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";
import { tripDestinationStore } from "@/lib/trips/activeDestination";
import { saveClosedTrip } from "@/lib/trips/saveTrip";


/**
 * Mantém o estado local da viagem em andamento (tripStore) com base na
 * telemetria MQTT. NÃO grava no banco — a persistência é feita pelo
 * webhook do Flespi. Este hook só alimenta a UI (cronômetro, mini-mapa,
 * consumo em tempo real).
 */
export function useLiveTripTracker() {
  const { telemetry } = useFlespiMqtt();
  const prevIgnition = useRef<boolean | undefined>(undefined);
  const lastTrailAt = useRef<number>(0);

  useEffect(() => {
    const ign = telemetry.ignitionOn;
    if (ign === undefined) return;
    const prev = prevIgnition.current;
    prevIgnition.current = ign;

    // OFF -> ON: abre viagem local
    const shouldOpen =
      (prev === false && ign === true) ||
      (prev === undefined && ign === true && !tripStore.get());
    if (shouldOpen) {
      const open: OpenTrip = {
        startTime: new Date().toISOString(),
        startLat: telemetry.latitude ?? null,
        startLng: telemetry.longitude ?? null,
        mileageAtStart: telemetry.mileageKm ?? null,
        lastLat: telemetry.latitude ?? null,
        lastLng: telemetry.longitude ?? null,
        lastMileage: telemetry.mileageKm ?? null,
        maxSpeedKmh: telemetry.speedKmh ?? 0,
        trail:
          typeof telemetry.latitude === "number" &&
          typeof telemetry.longitude === "number"
            ? [{
                lat: telemetry.latitude,
                lng: telemetry.longitude,
                speed: telemetry.speedKmh ?? null,
                t: Date.now(),
              }]
            : [],
      };
      tripStore.set(open);
      // Se havia destino pendente, promove para ativo agora que o motor ligou
      const promoted = tripDestinationStore.promotePending();
      if (promoted) {
        toast.success(`Viagem iniciada — monitorando até ${promoted.name}`);
      }
      return;
    }

    // ON -> OFF: fecha viagem local e grava no banco (fallback do webhook)
    if ((prev === true || prev === undefined) && ign === false) {
      const closing = tripStore.get();
      tripStore.set(null);
      const active = tripDestinationStore.getActive();
      if (active) {
        tripDestinationStore.setActive(null);
      }
      if (closing) {
        saveClosedTrip(closing)
          .then((result) => {
            if (result === "saved") {
              toast.success("Viagem salva no histórico");
              queryClient.invalidateQueries({ queryKey: ["trips-list"] });
            }
          })
          .catch((err) => {
            console.error("[trip] falha ao salvar viagem", err);
            toast.error("Não foi possível salvar a viagem");
          });
      }
    }


  }, [telemetry.ignitionOn, telemetry.latitude, telemetry.longitude, telemetry.mileageKm, telemetry.speedKmh]);

  // Atualiza últimos dados + rastro enquanto motor ligado
  useEffect(() => {
    const open = tripStore.get();
    if (!open) return;
    if (telemetry.ignitionOn !== true) return;

    const next: OpenTrip = {
      ...open,
      lastLat: telemetry.latitude ?? open.lastLat,
      lastLng: telemetry.longitude ?? open.lastLng,
      lastMileage: telemetry.mileageKm ?? open.lastMileage,
      maxSpeedKmh: Math.max(open.maxSpeedKmh, telemetry.speedKmh ?? 0),
      startLat: open.startLat ?? telemetry.latitude ?? null,
      startLng: open.startLng ?? telemetry.longitude ?? null,
      mileageAtStart: open.mileageAtStart ?? telemetry.mileageKm ?? null,
      trail: open.trail,
    };

    // Adiciona ponto ao trail se moveu >5m desde o último
    if (
      typeof telemetry.latitude === "number" &&
      typeof telemetry.longitude === "number"
    ) {
      const last = open.trail[open.trail.length - 1];
      const pt: TrailPoint = {
        lat: telemetry.latitude,
        lng: telemetry.longitude,
        speed: telemetry.speedKmh ?? null,
        t: Date.now(),
      };
      const shouldAppend =
        !last || haversineKm(last.lat, last.lng, pt.lat, pt.lng) >= 0.005;
      if (shouldAppend && Date.now() - lastTrailAt.current > 500) {
        lastTrailAt.current = Date.now();
        next.trail = next.trail.length >= 500
          ? [...next.trail.slice(-499), pt]
          : [...next.trail, pt];
      }
    }

    tripStore.set(next);
  }, [
    telemetry.latitude,
    telemetry.longitude,
    telemetry.mileageKm,
    telemetry.speedKmh,
    telemetry.ignitionOn,
  ]);
}
