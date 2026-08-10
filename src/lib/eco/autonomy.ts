/**
 * Autonomia ao vivo — consumo real medido na viagem atual, com fallback na
 * ficha técnica ajustada pelo estilo de condução. Módulo puro (sem React).
 */
import { autonomyKm, FUEL_RESERVE_RATIO } from "@/lib/trips/longTrip";
import { expectedKmpl, type FuelKind, type VehicleSpec } from "@/lib/vehicles/specs";

/** Percentual do tanque em que avisamos para ir ao posto (antes da reserva). */
export const REFUEL_ALERT_PCT = 15;
/** Reserva efetiva do tanque (luz acesa). */
export const RESERVE_PCT = FUEL_RESERVE_RATIO * 100;

/** Mínimos para considerar o consumo medido confiável. */
export const MIN_SAMPLE_KM = 2;
export const MIN_SAMPLE_DROP_PCT = 1;

export interface FuelSample {
  /** Km acumulados desde o início da medição. */
  km: number;
  /** Nível do tanque em % (0-100). */
  fuelPct: number;
}

/**
 * Consumo real (km/l) entre a amostra mais antiga e a mais recente.
 * `null` quando ainda não há queda de tanque / distância suficientes.
 */
export function measuredKmpl(samples: FuelSample[], tankL: number): number | null {
  if (samples.length < 2 || !Number.isFinite(tankL) || tankL <= 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const km = last.km - first.km;
  const dropPct = first.fuelPct - last.fuelPct;
  if (km < MIN_SAMPLE_KM || dropPct < MIN_SAMPLE_DROP_PCT) return null;
  const liters = (dropPct / 100) * tankL;
  if (liters <= 0) return null;
  const kmpl = km / liters;
  if (!Number.isFinite(kmpl) || kmpl <= 0 || kmpl > 60) return null;
  return kmpl;
}

/**
 * Consumo estimado pela ficha técnica, penalizado pela nota instantânea de
 * condução (100 = nota cheia, sem penalidade; 0 = -30%).
 */
export function styleAdjustedKmpl({
  fuel,
  avgSpeedKmh,
  spec,
  score,
}: {
  fuel: FuelKind;
  avgSpeedKmh?: number | null;
  spec: VehicleSpec;
  score?: number | null;
}): number {
  const base = expectedKmpl({ fuel, avgSpeedKmh, spec });
  const s = Number(score);
  const factor = Number.isFinite(s) ? 0.7 + 0.3 * Math.max(0, Math.min(100, s)) / 100 : 1;
  return base * factor;
}

/** Média exponencial para o número não oscilar a cada pacote de telemetria. */
export function smooth(previous: number | null, next: number, alpha = 0.25): number {
  if (previous == null || !Number.isFinite(previous)) return next;
  return previous + (next - previous) * alpha;
}

export type FuelStage = "ok" | "atencao" | "abastecer" | "reserva";

export function fuelStage(fuelPct: number | null): FuelStage {
  if (fuelPct == null || !Number.isFinite(fuelPct)) return "atencao";
  if (fuelPct <= RESERVE_PCT) return "reserva";
  if (fuelPct <= REFUEL_ALERT_PCT) return "abastecer";
  if (fuelPct <= 30) return "atencao";
  return "ok";
}

export const FUEL_STAGE_LABEL: Record<FuelStage, string> = {
  ok: "Autonomia folgada",
  atencao: "Fique de olho no tanque",
  abastecer: "Hora de abastecer",
  reserva: "Na reserva — abasteça já",
};

export const FUEL_STAGE_CLASS: Record<FuelStage, string> = {
  ok: "text-success border-success/40 bg-success/10",
  atencao: "text-warning border-warning/40 bg-warning/10",
  abastecer: "text-warning border-warning/40 bg-warning/10",
  reserva: "text-destructive border-destructive/40 bg-destructive/10",
};

/** Autonomia utilizável (km) com o nível atual, descontando a reserva. */
export function liveAutonomyKm({
  fuelPct,
  kmpl,
  tankL,
}: {
  fuelPct: number | null;
  kmpl: number | null;
  tankL: number;
}): number | null {
  if (fuelPct == null || kmpl == null) return null;
  return autonomyKm({ fuelPercent: fuelPct, kmpl, tankL });
}
