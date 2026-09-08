// Fonte única de verdade para km/L e litros de uma viagem.
// Puro: sem React, sem Supabase — recebe as linhas já carregadas.

import { expectedKmpl, DEFAULT_SPEC, type FuelKind, type VehicleSpec } from "@/lib/vehicles/specs";

/** Procedência do km/L usado no cálculo (espelha trips.fuel_source). */
export type FuelSource = "calibrado" | "ficha" | "device" | "padrao";

/** Linha de public.vehicle_fuel_calibration (apenas o que importa aqui). */
export interface FuelCalibrationRow {
  kmpl: number | string | null;
  samples: number | string | null;
  fuel_type?: string | null;
}

export interface ResolvedKmpl {
  kmpl: number;
  source: FuelSource;
}

/** Mínimo de abastecimentos cheio-a-cheio para confiar na calibração medida. */
export const MIN_CALIBRATION_SAMPLES = 2;

/** Consumo em marcha lenta de um motor 1.3: ~0,7 L por hora parado. */
export const IDLE_LITERS_PER_HOUR = 0.7;

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Escolhe o km/L da viagem, em ordem de confiança:
 *  1. calibração medida cheio-a-cheio (>= 2 amostras) → "calibrado";
 *  2. consumo médio preenchido pelo usuário no veículo → "calibrado";
 *  3. meta Inmetro da ficha técnica, interpolada pela velocidade média → "ficha".
 * Nunca devolve um número mágico.
 */
export function resolveKmpl({
  calibration,
  vehicleKmpl,
  spec = DEFAULT_SPEC,
  fuel = "misto",
  avgSpeedKmh,
}: {
  calibration?: FuelCalibrationRow | null;
  vehicleKmpl?: number | string | null;
  spec?: VehicleSpec;
  fuel?: FuelKind;
  avgSpeedKmh?: number | null;
}): ResolvedKmpl {
  const calKmpl = positive(calibration?.kmpl);
  const samples = Number(calibration?.samples ?? 0);
  if (calKmpl != null && Number.isFinite(samples) && samples >= MIN_CALIBRATION_SAMPLES) {
    return { kmpl: calKmpl, source: "calibrado" };
  }

  const declared = positive(vehicleKmpl);
  if (declared != null) return { kmpl: declared, source: "calibrado" };

  return { kmpl: expectedKmpl({ fuel, avgSpeedKmh, spec }), source: "ficha" };
}

/**
 * Litros da viagem: rodagem + marcha lenta.
 * Retorna null quando não há km/L válido.
 */
export function tripFuelLiters({
  distanceKm,
  kmpl,
  idleSeconds = 0,
  idleLitersPerHour = IDLE_LITERS_PER_HOUR,
}: {
  distanceKm: number;
  kmpl: number | null | undefined;
  idleSeconds?: number | null;
  idleLitersPerHour?: number;
}): number | null {
  const k = positive(kmpl);
  if (k == null) return null;
  const km = Math.max(0, Number(distanceKm) || 0);
  const idle = Math.max(0, Number(idleSeconds) || 0);
  const liters = km / k + (idle / 3600) * idleLitersPerHour;
  return Number(liters.toFixed(3));
}
