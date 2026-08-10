import { useMemo, useRef } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { haversineKm } from "@/lib/trips/geo";
import { gradeLive } from "@/lib/eco/live";
import {
  fuelStage,
  liveAutonomyKm,
  measuredKmpl,
  smooth,
  styleAdjustedKmpl,
  type FuelSample,
  type FuelStage,
} from "@/lib/eco/autonomy";

export interface LiveAutonomy {
  /** Consumo em km/l usado no cálculo. */
  kmpl: number | null;
  source: "medido" | "estimado";
  fuelPct: number | null;
  liters: number | null;
  autonomyKm: number | null;
  stage: FuelStage;
  needsRefuel: boolean;
  ignitionOn: boolean;
  /** Nota instantânea de condução (0-100). */
  score: number | null;
}

const MAX_SAMPLES = 60;

/**
 * Autonomia em tempo real: mede o consumo real da viagem atual (queda do nível
 * do tanque por km rodado) e cai no consumo da ficha técnica ajustado pelo
 * estilo de condução enquanto não houver dados suficientes.
 */
export function useLiveAutonomy(): LiveAutonomy {
  const { telemetry } = useTelemetry();
  const { spec, fuel } = useActiveVehicle();

  const samples = useRef<FuelSample[]>([]);
  const distanceKm = useRef(0);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastMileage = useRef<number | null>(null);
  const lastSpeed = useRef<{ v: number; t: number } | null>(null);
  const smoothed = useRef<number | null>(null);

  const {
    ignitionOn,
    fuelLevel,
    mileageKm,
    latitude,
    longitude,
    speedKmh,
    canSpeedKmh,
    engineRpm,
    engineLoad,
  } = telemetry;

  return useMemo(() => {
    const on = ignitionOn === true;
    const speed = canSpeedKmh ?? speedKmh;

    // Zera a medição quando o motor desliga (nova viagem = nova medição).
    if (!on) {
      samples.current = [];
      distanceKm.current = 0;
      lastPos.current = null;
      lastMileage.current = null;
      lastSpeed.current = null;
    } else {
      // Distância acumulada: prefere odômetro, senão soma o trajeto GPS.
      if (typeof mileageKm === "number" && Number.isFinite(mileageKm)) {
        if (lastMileage.current != null && mileageKm >= lastMileage.current) {
          distanceKm.current += mileageKm - lastMileage.current;
        }
        lastMileage.current = mileageKm;
      } else if (typeof latitude === "number" && typeof longitude === "number") {
        if (lastPos.current) {
          const d = haversineKm(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
          if (Number.isFinite(d) && d < 5) distanceKm.current += d;
        }
        lastPos.current = { lat: latitude, lng: longitude };
      }

      if (typeof fuelLevel === "number" && Number.isFinite(fuelLevel)) {
        const last = samples.current[samples.current.length - 1];
        if (!last || last.km !== distanceKm.current || last.fuelPct !== fuelLevel) {
          samples.current.push({ km: distanceKm.current, fuelPct: fuelLevel });
          if (samples.current.length > MAX_SAMPLES) samples.current.shift();
        }
      }
    }

    // Aceleração instantânea (km/h por segundo) para calibrar a nota.
    let accel: number | null = null;
    const now = Date.now();
    if (typeof speed === "number" && Number.isFinite(speed)) {
      const prev = lastSpeed.current;
      if (prev && now > prev.t) {
        const dt = (now - prev.t) / 1000;
        if (dt >= 0.5 && dt <= 30) accel = (speed - prev.v) / dt;
      }
      lastSpeed.current = { v: speed, t: now };
    }

    const perf = gradeLive({
      rpm: engineRpm ?? null,
      speedKmh: speed ?? null,
      accelKmhPerS: accel,
      load: engineLoad ?? null,
      spec,
    });

    const tankL = spec.tankL;
    const measured = measuredKmpl(samples.current, tankL);
    const avgSpeed = typeof speed === "number" ? speed : null;
    const raw =
      measured ?? styleAdjustedKmpl({ fuel, avgSpeedKmh: avgSpeed, spec, score: perf.score });

    smoothed.current = on ? smooth(smoothed.current, raw) : smoothed.current;
    const kmpl = smoothed.current ?? raw;

    const pct =
      typeof fuelLevel === "number" && Number.isFinite(fuelLevel) ? fuelLevel : null;
    const liters = pct != null ? (pct / 100) * tankL : null;
    const autonomy = liveAutonomyKm({ fuelPct: pct, kmpl, tankL });
    const stage = fuelStage(pct);

    return {
      kmpl,
      source: measured != null ? ("medido" as const) : ("estimado" as const),
      fuelPct: pct,
      liters,
      autonomyKm: autonomy,
      stage,
      needsRefuel: stage === "abastecer" || stage === "reserva",
      ignitionOn: on,
      score: perf.score,
    };
  }, [
    ignitionOn,
    fuelLevel,
    mileageKm,
    latitude,
    longitude,
    speedKmh,
    canSpeedKmh,
    engineRpm,
    engineLoad,
    spec,
    fuel,
  ]);
}
