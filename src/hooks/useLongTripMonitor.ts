import { useEffect, useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { notifyLongTripAlert } from "@/lib/push/push.functions";
import { toast } from "sonner";

import { useTelemetry } from "@/hooks/useTelemetry";
import { useOpenTrip } from "@/lib/trips/store";
import { remainingPathKm, useTripPlan } from "@/lib/trips/plan";
import { autonomyKm, planKmpl } from "@/lib/trips/longTrip";
import {
  fuelStatus,
  pendingLongTripAlerts,
  secondsToNextRest,
  type LongTripLiveState,
} from "@/lib/trips/longTripAlerts";
import { getFuelKind } from "@/lib/eco/settings";
import { useActiveVehicle } from "@/lib/vehicles/active";

export interface LongTripLive extends LongTripLiveState {
  active: boolean;
  secondsToRest: number;
  fuel: ReturnType<typeof fuelStatus>;
}

/**
 * Estado ao vivo da viagem longa: tempo dirigindo, km restantes na rota
 * planejada e autonomia com o tanque atual.
 */
export function useLongTripLive(nowMs?: number): LongTripLive {
  const plan = useTripPlan();
  const open = useOpenTrip();
  const { telemetry } = useTelemetry();
  const { spec } = useActiveVehicle();

  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const fuelLevel = telemetry.fuelLevel;
  const now = nowMs ?? Date.now();

  return useMemo(() => {
    const active = Boolean(open) && Boolean(plan?.monitoring) && Boolean(plan?.path?.length);

    const elapsedSeconds = open
      ? Math.max(0, Math.floor((now - new Date(open.startTime).getTime()) / 1000))
      : 0;

    const remaining =
      plan && typeof lat === "number" && typeof lng === "number"
        ? remainingPathKm(lat, lng, plan.path)
        : null;

    const kmpl = plan
      ? planKmpl({
          distanceKm: plan.distanceKm,
          durationSeconds: plan.durationSeconds,
          fuel: getFuelKind(),
          spec,
        })
      : null;

    const pct =
      typeof fuelLevel === "number" && Number.isFinite(fuelLevel)
        ? fuelLevel
        : (plan?.fuelPercent ?? null);

    const autonomy =
      pct != null && kmpl != null
        ? autonomyKm({ fuelPercent: pct, kmpl, tankL: spec.tankL })
        : null;

    const state: LongTripLiveState = {
      elapsedSeconds,
      remainingKm: remaining,
      autonomyKm: autonomy,
    };

    return {
      ...state,
      active,
      secondsToRest: secondsToNextRest(elapsedSeconds),
      fuel: fuelStatus(state),
    };
  }, [plan, open, lat, lng, fuelLevel, now, spec]);
}

/**
 * Dispara os avisos de fadiga (a cada 2 h) e de combustível durante o
 * monitoramento da rota planejada. Cada aviso aparece apenas uma vez.
 */
export function useLongTripMonitor() {
  const live = useLongTripLive();
  const shown = useRef(new Set<string>());
  const notify = useServerFn(notifyLongTripAlert);

  const { active, elapsedSeconds, remainingKm, autonomyKm: autonomy } = live;

  useEffect(() => {
    if (!active) {
      shown.current.clear();
      return;
    }
    const alerts = pendingLongTripAlerts({ elapsedSeconds, remainingKm, autonomyKm: autonomy });
    for (const alert of alerts) {
      if (shown.current.has(alert.key)) continue;
      shown.current.add(alert.key);
      const fn = alert.kind === "combustivel-critico" ? toast.error : toast.warning;
      fn(alert.title, { description: alert.description, duration: 10_000 });
      void notify({
        data: {
          kind: alert.kind,
          key: alert.key,
          title: alert.title,
          description: alert.description,
        },
      }).catch((err: unknown) => console.warn("[viagem-longa] push falhou", err));
    }
  }, [active, elapsedSeconds, remainingKm, autonomy, notify]);
}
