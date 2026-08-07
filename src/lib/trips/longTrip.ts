/**
 * Modo Viagem Longa — autonomia, ponto de reabastecimento e paradas de descanso.
 * Módulo puro (sem React/DOM), calculado sobre o plano de rota já existente.
 */
import { haversineKm } from "./geo";
import { DEFAULT_SPEC, expectedKmpl, type FuelKind, type VehicleSpec } from "@/lib/vehicles/specs";

/** Acima destes valores a viagem é considerada "longa". */
export const LONG_TRIP_MIN_KM = 150;
export const LONG_TRIP_MIN_SECONDS = 2 * 3600;

/** Intervalo sugerido entre paradas de descanso. */
export const REST_INTERVAL_SECONDS = 2 * 3600;

/** Reserva de segurança do tanque (não contamos os últimos 10%). */
export const FUEL_RESERVE_RATIO = 0.1;

export function isLongTrip(distanceKm: number, durationSeconds: number): boolean {
  return distanceKm >= LONG_TRIP_MIN_KM || durationSeconds >= LONG_TRIP_MIN_SECONDS;
}

/**
 * Autonomia estimada (km) para um nível de tanque em %.
 * Usa a capacidade do tanque da ficha técnica e o consumo esperado.
 */
export function autonomyKm({
  fuelPercent,
  kmpl,
  tankL = ACTIVE_SPEC.tankL,
  reserve = FUEL_RESERVE_RATIO,
}: {
  fuelPercent: number;
  kmpl: number;
  tankL?: number;
  reserve?: number;
}): number | null {
  const pct = Number(fuelPercent);
  const consumption = Number(kmpl);
  if (!Number.isFinite(pct) || !Number.isFinite(consumption) || consumption <= 0) return null;
  const usable = Math.max(0, Math.min(100, pct) / 100 - reserve);
  return usable * tankL * consumption;
}

/** Consumo esperado (km/l) pela velocidade média do trajeto planejado. */
export function planKmpl({
  distanceKm,
  durationSeconds,
  fuel = "misto",
  fallbackKmpl,
}: {
  distanceKm: number;
  durationSeconds: number;
  fuel?: FuelKind;
  fallbackKmpl?: number | null;
}): number {
  if (fallbackKmpl && fallbackKmpl > 0) return fallbackKmpl;
  const hours = durationSeconds / 3600;
  const avgSpeedKmh = hours > 0 ? distanceKm / hours : null;
  return expectedKmpl({ fuel, avgSpeedKmh });
}

/** Distância acumulada (km) ao longo do path, índice a índice. */
export function cumulativeKm(path: Array<[number, number]>): number[] {
  const out: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    out.push(out[i - 1] + haversineKm(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]));
  }
  return out;
}

/** Ponto do path mais próximo de uma distância percorrida (km). */
export function pointAtKm(
  path: Array<[number, number]>,
  targetKm: number,
): { lat: number; lng: number; km: number } | null {
  if (path.length === 0) return null;
  const cum = cumulativeKm(path);
  const total = cum[cum.length - 1];
  if (targetKm <= 0) return { lat: path[0][0], lng: path[0][1], km: 0 };
  if (targetKm >= total) {
    const last = path[path.length - 1];
    return { lat: last[0], lng: last[1], km: total };
  }
  let idx = 0;
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] >= targetKm) {
      idx = i;
      break;
    }
  }
  return { lat: path[idx][0], lng: path[idx][1], km: cum[idx] };
}

export interface RefuelPoint {
  km: number;
  lat: number;
  lng: number;
}

/**
 * Onde a autonomia acaba ao longo da rota. `null` quando o tanque cobre o trajeto
 * inteiro (ou quando não há dados suficientes).
 */
export function refuelPoint({
  path,
  distanceKm,
  autonomy,
}: {
  path: Array<[number, number]>;
  distanceKm: number;
  autonomy: number | null;
}): RefuelPoint | null {
  if (autonomy == null || !Number.isFinite(autonomy)) return null;
  if (autonomy >= distanceKm) return null;
  const p = pointAtKm(path, autonomy);
  if (!p) return { km: Math.max(0, autonomy), lat: 0, lng: 0 };
  return { km: p.km, lat: p.lat, lng: p.lng };
}

export interface RestStop {
  index: number;
  /** Segundos de viagem até esta parada. */
  atSeconds: number;
  /** Km aproximados até esta parada. */
  km: number;
  lat: number;
  lng: number;
  /** Horário previsto (ISO) se houver hora de partida. */
  etaISO: string | null;
}

/**
 * Paradas de descanso sugeridas a cada 2h de trajeto (distribuição proporcional
 * ao tempo total, assumindo velocidade média constante).
 */
export function restStops({
  path,
  distanceKm,
  durationSeconds,
  departureISO,
  intervalSeconds = REST_INTERVAL_SECONDS,
}: {
  path: Array<[number, number]>;
  distanceKm: number;
  durationSeconds: number;
  departureISO?: string | null;
  intervalSeconds?: number;
}): RestStop[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= intervalSeconds) return [];
  const stops: RestStop[] = [];
  const departure = departureISO ? new Date(departureISO).getTime() : null;
  let index = 0;
  for (let t = intervalSeconds; t < durationSeconds; t += intervalSeconds) {
    index += 1;
    const km = (t / durationSeconds) * distanceKm;
    const p = pointAtKm(path, km);
    stops.push({
      index,
      atSeconds: t,
      km,
      lat: p?.lat ?? 0,
      lng: p?.lng ?? 0,
      etaISO:
        departure != null && Number.isFinite(departure)
          ? new Date(departure + t * 1000).toISOString()
          : null,
    });
  }
  return stops;
}

export type AutonomyLevel = "ok" | "atencao" | "critico";

/** Semáforo da autonomia frente à distância restante. */
export function autonomyLevel(autonomy: number | null, distanceKm: number): AutonomyLevel {
  if (autonomy == null) return "atencao";
  if (autonomy >= distanceKm * 1.2) return "ok";
  if (autonomy >= distanceKm) return "atencao";
  return "critico";
}

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  ok: "Autonomia folgada",
  atencao: "Autonomia justa",
  critico: "Vai precisar reabastecer",
};

export const AUTONOMY_CLASS: Record<AutonomyLevel, string> = {
  ok: "text-success border-success/40 bg-success/10",
  atencao: "text-warning border-warning/40 bg-warning/10",
  critico: "text-destructive border-destructive/40 bg-destructive/10",
};

export interface LongTripSummary {
  isLong: boolean;
  kmpl: number;
  autonomy: number | null;
  level: AutonomyLevel;
  refuel: RefuelPoint | null;
  rests: RestStop[];
}

export function buildLongTripSummary({
  path,
  distanceKm,
  durationSeconds,
  fuelPercent,
  kmpl,
  fuel = "misto",
  departureISO,
}: {
  path: Array<[number, number]>;
  distanceKm: number;
  durationSeconds: number;
  fuelPercent: number | null | undefined;
  kmpl?: number | null;
  fuel?: FuelKind;
  departureISO?: string | null;
}): LongTripSummary {
  const effectiveKmpl = planKmpl({
    distanceKm,
    durationSeconds,
    fuel,
    fallbackKmpl: kmpl ?? null,
  });
  const autonomy =
    fuelPercent == null ? null : autonomyKm({ fuelPercent, kmpl: effectiveKmpl });
  return {
    isLong: isLongTrip(distanceKm, durationSeconds),
    kmpl: effectiveKmpl,
    autonomy,
    level: autonomyLevel(autonomy, distanceKm),
    refuel: refuelPoint({ path, distanceKm, autonomy }),
    rests: restStops({ path, distanceKm, durationSeconds, departureISO }),
  };
}
