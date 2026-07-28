import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { tripStore, type OpenTrip, type TrailPoint } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";
import { tripDestinationStore } from "@/lib/trips/activeDestination";
import { saveClosedTrip } from "@/lib/trips/saveTrip";
import {
  detectBetween,
  idleBetween,
  type EcoSample,
} from "@/lib/eco/detect";
import { ECO_EVENT_LABEL } from "@/lib/eco/score";
import { getEcoSettings } from "@/lib/eco/settings";

/**
 * Mantém o estado local da viagem em andamento (tripStore) com base na
 * telemetria MQTT: cronômetro, mini-mapa, consumo e agora também a detecção
 * de eventos de direção agressiva (Eco Score). A persistência acontece ao
 * desligar o motor (fallback do webhook do Flespi).
 */
export function useLiveTripTracker() {
  const { telemetry } = useFlespiMqtt();
  const queryClient = useQueryClient();

  const prevIgnition = useRef<boolean | undefined>(undefined);
  const lastTrailAt = useRef<number>(0);
  const lastSample = useRef<EcoSample | null>(null);
  // Carro pode "morrer" (motor apaga) no meio da viagem: não encerramos na hora.
  // Só encerramos se a ignição ficar desligada por mais que este período.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IGNITION_OFF_GRACE_MS = 1 * 60_000;

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    const ign = telemetry.ignitionOn;
    if (ign === undefined) return;
    const prev = prevIgnition.current;
    prevIgnition.current = ign;

    // Motor voltou a ligar dentro do período de tolerância: continua a mesma viagem
    if (ign === true && closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
      if (tripStore.get()) return;
    }

    // OFF -> ON: abre viagem local
    const shouldOpen =
      ((prev === false && ign === true) ||
        (prev === undefined && ign === true)) && !tripStore.get();
    if (shouldOpen) {

      lastSample.current = null;
      const open: OpenTrip = {
        startTime: new Date().toISOString(),
        startLat: telemetry.latitude ?? null,
        startLng: telemetry.longitude ?? null,
        mileageAtStart: telemetry.mileageKm ?? null,
        lastLat: telemetry.latitude ?? null,
        lastLng: telemetry.longitude ?? null,
        lastMileage: telemetry.mileageKm ?? null,
        maxSpeedKmh: telemetry.speedKmh ?? 0,
        ecoEvents: [],
        idleSeconds: 0,
        trail:
          typeof telemetry.latitude === "number" &&
          typeof telemetry.longitude === "number"
            ? [{
                lat: telemetry.latitude,
                lng: telemetry.longitude,
                speed: telemetry.speedKmh ?? null,
                heading: telemetry.headingDeg ?? null,
                rpm: telemetry.engineRpm ?? null,
                load: telemetry.engineLoad ?? null,
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

    // ON -> OFF: agenda o encerramento. Se for só o motor morrendo e a chave
    // for girada de novo dentro da tolerância, a viagem continua.
    if ((prev === true || prev === undefined) && ign === false) {
      if (!tripStore.get() || closeTimer.current) return;
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        const closing = tripStore.get();
        tripStore.set(null);
        lastSample.current = null;
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
      }, IGNITION_OFF_GRACE_MS);
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

    // --- Eco Score: detecta eventos entre a amostra anterior e a atual ---
    const settings = getEcoSettings();
    const speedNow = telemetry.canSpeedKmh ?? telemetry.speedKmh;
    if (typeof speedNow === "number") {
      const sample: EcoSample = {
        t: Date.now(),
        speed: speedNow,
        heading: telemetry.headingDeg ?? null,
        rpm: telemetry.engineRpm ?? null,
        load: telemetry.engineLoad ?? null,
        lat: telemetry.latitude ?? null,
        lng: telemetry.longitude ?? null,
        greenDrivingType: telemetry.greenDrivingType ?? null,
        greenDrivingValue: telemetry.greenDrivingValue ?? null,
      };
      const prevSample = lastSample.current;
      if (prevSample && sample.t - prevSample.t >= 900) {
        const events = detectBetween(prevSample, sample, settings.thresholds);
        const idle = idleBetween(prevSample, sample);
        if (events.length > 0) {
          next.ecoEvents = [...next.ecoEvents, ...events].slice(-300);
          if (settings.liveAlerts) {
            const severe = events.find((e) => e.severity === "severe");
            if (severe) {
              toast.warning(ECO_EVENT_LABEL[severe.type], {
                description: "Evento registrado no seu Eco Score.",
              });
            }
          }
        }
        if (idle > 0) next.idleSeconds = next.idleSeconds + idle;
        lastSample.current = sample;
      } else if (!prevSample) {
        lastSample.current = sample;
      }
    }

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
        heading: telemetry.headingDeg ?? null,
        rpm: telemetry.engineRpm ?? null,
        load: telemetry.engineLoad ?? null,
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
    telemetry.canSpeedKmh,
    telemetry.engineRpm,
    telemetry.engineLoad,
    telemetry.headingDeg,
    telemetry.ignitionOn,
  ]);
}
