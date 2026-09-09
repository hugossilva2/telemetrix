/**
 * km/L medido de verdade: segmentos cheio-a-cheio entre abastecimentos.
 * Módulo puro (sem React, sem Supabase). Espelha as mesmas regras da função
 * public.recompute_fuel_calibration no banco: só abastecimentos com tanque
 * cheio, do mesmo tipo de combustível, e segmentos entre 30 e 1200 km.
 */
import { weekKey } from "@/lib/reports/week";

export interface FullTankLog {
  date: string;
  liters_filled: number | string | null;
  mileage_at_fill: number | string | null;
  is_full_tank?: boolean | null;
  fuel_type?: string | null;
}

export interface MeasuredSegment {
  /** Data do abastecimento que fecha o segmento. */
  date: string;
  km: number;
  liters: number;
  kmpl: number;
}

export const MIN_SEGMENT_KM = 30;
export const MAX_SEGMENT_KM = 1200;
export const MIN_KMPL = 4;
export const MAX_KMPL = 30;
/** Segmentos mínimos (= 2 tanques cheios) para exibir a série medida. */
export const MIN_MEASURED_SEGMENTS = 1;

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Segmentos medidos, em ordem cronológica. `fuelType` filtra o combustível
 * ativo; quando omitido, considera todos.
 *
 * Os litros do trecho somam TODOS os abastecimentos feitos entre dois tanques
 * cheios (inclusive os parciais) — ignorar os parciais inflava o km/L.
 */
export function measuredSegments(logs: FullTankLog[], fuelType?: string | null): MeasuredSegment[] {
  const fills = logs
    .filter((l) => (fuelType ? (l.fuel_type ?? "gasolina") === fuelType : true))
    .map((l) => ({
      date: l.date,
      liters: num(l.liters_filled) ?? 0,
      km: num(l.mileage_at_fill) ?? 0,
      full: l.is_full_tank !== false,
    }))
    .filter((l) => l.km > 0)
    .sort((a, b) => a.km - b.km);

  const out: MeasuredSegment[] = [];
  let prevFull: { km: number } | null = null;
  let pendingLiters = 0;

  for (const fill of fills) {
    if (!fill.full) {
      // Parcial: entra nos litros do próximo trecho fechado por tanque cheio.
      if (prevFull) pendingLiters += Math.max(0, fill.liters);
      continue;
    }
    if (prevFull) {
      const km = fill.km - prevFull.km;
      const liters = pendingLiters + Math.max(0, fill.liters);
      if (liters > 0 && km >= MIN_SEGMENT_KM && km <= MAX_SEGMENT_KM) {
        const kmpl = km / liters;
        if (kmpl >= MIN_KMPL && kmpl <= MAX_KMPL) {
          out.push({ date: fill.date, km, liters: +liters.toFixed(3), kmpl: +kmpl.toFixed(2) });
        }
      }
    }
    prevFull = { km: fill.km };
    pendingLiters = 0;
  }
  return out.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** km/L medido por semana (soma de km ÷ soma de litros dos segmentos da semana). */
export function weeklyMeasuredKmpl(segments: MeasuredSegment[]): Map<string, number> {
  const acc = new Map<string, { km: number; liters: number }>();
  for (const s of segments) {
    const k = weekKey(s.date);
    const cur = acc.get(k) ?? { km: 0, liters: 0 };
    cur.km += s.km;
    cur.liters += s.liters;
    acc.set(k, cur);
  }
  const out = new Map<string, number>();
  for (const [k, v] of acc) {
    if (v.liters > 0) out.set(k, +(v.km / v.liters).toFixed(2));
  }
  return out;
}

/** Média ponderada de todos os segmentos medidos. */
export function measuredAvgKmpl(segments: MeasuredSegment[]): number | null {
  const km = segments.reduce((s, p) => s + p.km, 0);
  const liters = segments.reduce((s, p) => s + p.liters, 0);
  return liters > 0 ? +(km / liters).toFixed(2) : null;
}
