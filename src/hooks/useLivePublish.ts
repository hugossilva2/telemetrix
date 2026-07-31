import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTelemetry } from "@/hooks/useTelemetry";
import { tripStore } from "@/lib/trips/store";
import { publishLiveState } from "@/lib/tracker/livePublish.functions";

const ON_INTERVAL_MS = 10_000;
const OFF_INTERVAL_MS = 60_000;

/**
 * Espelha a telemetria local no banco em intervalos curtos, para que o modo
 * observador (/acompanhar) veja a posição e a viagem em tempo real.
 */
export function useLivePublish() {
  const { telemetry } = useTelemetry();
  const publish = useServerFn(publishLiveState);
  const teleRef = useRef(telemetry);
  teleRef.current = telemetry;
  const sending = useRef(false);
  const lastAt = useRef(0);

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      if (stopped || sending.current) return;
      const t = teleRef.current;
      if (t.ignitionOn === undefined && t.latitude == null) return;
      const interval = t.ignitionOn ? ON_INTERVAL_MS : OFF_INTERVAL_MS;
      if (Date.now() - lastAt.current < interval - 500) return;

      const open = tripStore.get();
      sending.current = true;
      try {
        await publish({
          data: {
            ignitionOn: t.ignitionOn ?? null,
            lat: t.latitude ?? null,
            lng: t.longitude ?? null,
            speedKmh: t.canSpeedKmh ?? t.speedKmh ?? null,
            mileageKm: t.mileageKm ?? null,
            maxSpeedKmh: open?.maxSpeedKmh ?? t.speedKmh ?? 0,
            startTime: open?.startTime ?? null,
          },
        });
        lastAt.current = Date.now();
      } catch (err) {
        console.warn("[live] falha ao publicar telemetria", err);
        lastAt.current = Date.now();
      } finally {
        sending.current = false;
      }
    };

    tick();
    const id = setInterval(tick, 5_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [publish]);
}
