import { ACTIVE_SPEC, referenceAccelKmhPerS } from "@/lib/vehicles/specs";

export type PerfGrade = "otimo" | "bom" | "regular" | "pessimo";

export interface PerfBand {
  grade: PerfGrade;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const PERF_BANDS: Record<PerfGrade, PerfBand> = {
  otimo: {
    grade: "otimo",
    label: "Ótimo",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  bom: {
    grade: "bom",
    label: "Bom",
    color: "text-lime-500",
    bg: "bg-lime-500/10",
    border: "border-lime-500/30",
  },
  regular: {
    grade: "regular",
    label: "Regular",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  pessimo: {
    grade: "pessimo",
    label: "Péssimo",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
};

export function bandFromScore(score: number | null): PerfBand {
  if (score == null || !Number.isFinite(score)) return PERF_BANDS.regular;
  if (score >= 85) return PERF_BANDS.otimo;
  if (score >= 70) return PERF_BANDS.bom;
  if (score >= 50) return PERF_BANDS.regular;
  return PERF_BANDS.pessimo;
}

export interface LivePerfInput {
  rpm?: number | null;
  speedKmh?: number | null;
  /** aceleração instantânea em km/h por segundo (positiva = acelerando) */
  accelKmhPerS?: number | null;
  load?: number | null;
  maxSpeedKmh?: number;
}

export interface LivePerf {
  /** nota instantânea 0-100 */
  score: number;
  band: PerfBand;
  /** dica curta de coaching, ou null quando está tudo bem */
  hint: string | null;
}

const { ecoRpm, gearbox } = ACTIVE_SPEC;

/**
 * Nota instantânea de desempenho, calibrada pela ficha do veículo:
 * faixa econômica de giro, aceleração máxima de fábrica e limite de velocidade.
 */
export function gradeLive({
  rpm,
  speedKmh,
  accelKmhPerS,
  load,
  maxSpeedKmh = 110,
}: LivePerfInput): LivePerf {
  let penalty = 0;
  let hint: string | null = null;
  const refAccel = referenceAccelKmhPerS();
  const v = Number(speedKmh) || 0;

  if (typeof rpm === "number" && rpm > 0) {
    if (rpm > ecoRpm.max) {
      const over = (rpm - ecoRpm.max) / 1000;
      penalty += Math.min(45, over * 30);
      if (rpm > ecoRpm.max + 1000) {
        hint = `Giro em ${Math.round(rpm)} rpm — troque de marcha (${gearbox.toLowerCase()})`;
      } else {
        hint = "Giro acima da faixa econômica (1.500-2.500 rpm)";
      }
    } else if (rpm < ecoRpm.min - 300 && v > 20) {
      penalty += 12;
      hint = "Giro muito baixo para a velocidade — reduza a marcha";
    }
  }

  const a = Number(accelKmhPerS);
  if (Number.isFinite(a)) {
    if (a >= refAccel * 0.7) {
      penalty += Math.min(40, ((a - refAccel * 0.7) / refAccel) * 60 + 15);
      hint = hint ?? "Aceleração acima do que o 1.3 entrega com eficiência";
    } else if (a <= -8) {
      penalty += Math.min(35, (Math.abs(a) - 8) * 4 + 12);
      hint = hint ?? "Freada forte — antecipe mais (freio traseiro a tambor)";
    }
  }

  if (v > maxSpeedKmh) {
    penalty += Math.min(30, (v - maxSpeedKmh) * 1.2 + 10);
    hint = hint ?? `Acima de ${maxSpeedKmh} km/h: consumo sobe rápido`;
  }

  if (typeof load === "number" && load >= 85 && v < 60) {
    penalty += 10;
    hint = hint ?? "Motor sob carga alta em baixa velocidade";
  }

  const score = Math.round(Math.max(0, Math.min(100, 100 - penalty)));
  return { score, band: bandFromScore(score), hint };
}
