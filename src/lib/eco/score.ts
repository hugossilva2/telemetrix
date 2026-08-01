import type { EcoEvent, EcoEventType, EcoSeverity } from "./detect";

/** Penalidade por evento (pontos por 100 km). */
const PENALTY: Record<EcoEventType, Record<EcoSeverity, number>> = {
  harsh_brake: { moderate: 2, severe: 4 },
  harsh_accel: { moderate: 1.5, severe: 3 },
  harsh_corner: { moderate: 1.5, severe: 3 },
  overspeed: { moderate: 2, severe: 4 },
  high_rpm: { moderate: 1, severe: 2 },
};

/** Litros desperdiçados por evento (estimativa). */
const WASTE_L: Record<EcoEventType, Record<EcoSeverity, number>> = {
  harsh_brake: { moderate: 0.015, severe: 0.03 },
  harsh_accel: { moderate: 0.02, severe: 0.04 },
  harsh_corner: { moderate: 0.005, severe: 0.01 },
  overspeed: { moderate: 0.03, severe: 0.06 },
  high_rpm: { moderate: 0.015, severe: 0.03 },
};

/** Consumo em marcha lenta de um motor 1.0-2.0: ~0,7 L por hora parado. */
const IDLE_L_PER_HOUR = 0.7;

export const ECO_EVENT_LABEL: Record<EcoEventType, string> = {
  harsh_brake: "Freada brusca",
  harsh_accel: "Aceleração agressiva",
  harsh_corner: "Curva acentuada",
  overspeed: "Excesso de velocidade",
  high_rpm: "Giro alto",
};

export const ECO_EVENT_COLOR: Record<EcoEventType, string> = {
  harsh_brake: "text-destructive",
  harsh_accel: "text-orange-500",
  harsh_corner: "text-warning",
  overspeed: "text-rose-500",
  high_rpm: "text-violet-500",
};

export interface EcoCounts {
  harsh_brake: number;
  harsh_accel: number;
  harsh_corner: number;
  overspeed: number;
  high_rpm: number;
}

export interface EcoSummary {
  score: number;
  counts: EcoCounts;
  idleSeconds: number;
  wastedFuelLiters: number;
  wastedCost: number;
  totalEvents: number;
}

export function countEvents(events: EcoEvent[]): EcoCounts {
  const counts: EcoCounts = {
    harsh_brake: 0,
    harsh_accel: 0,
    harsh_corner: 0,
    overspeed: 0,
    high_rpm: 0,
  };
  for (const e of events) {
    if (e.type in counts) counts[e.type] += 1;
  }
  return counts;
}

export function summarizeEco({
  events,
  idleSeconds,
  distanceKm,
  kmpl,
  pricePerLiter = 5.89,
  fuel,
  avgSpeedKmh,
}: {
  events: EcoEvent[];
  idleSeconds: number;
  distanceKm: number;
  kmpl?: number;
  pricePerLiter?: number;
  /** combustível em uso, para a meta Inmetro do veículo */
  fuel?: FuelKind;
  /** velocidade média da viagem, para escolher ciclo urbano/rodoviário */
  avgSpeedKmh?: number | null;
}): EcoSummary {
  const counts = countEvents(events);
  const reference = expectedKmpl({ fuel: fuel ?? "misto", avgSpeedKmh });
  const effectiveKmpl = kmpl && kmpl > 0 ? kmpl : reference;

  let penalty = 0;
  let wasted = 0;
  for (const e of events) {
    const p = PENALTY[e.type];
    const w = WASTE_L[e.type];
    if (p) penalty += p[e.severity] ?? p.moderate;
    if (w) wasted += w[e.severity] ?? w.moderate;

    // Giro alto: penalidade proporcional à distância da faixa econômica.
    if (e.type === "high_rpm" && Number.isFinite(e.value)) {
      const over = Math.max(0, Number(e.value) - ECO_RPM_MAX) / 1000;
      penalty += over * 1.5;
      wasted += over * 0.02;
    }
  }

  // Marcha lenta: 1 ponto a cada 5 min parado com motor ligado
  const idleMinutes = Math.max(0, idleSeconds) / 60;
  penalty += idleMinutes / 5;
  wasted += (idleMinutes / 60) * IDLE_L_PER_HOUR;

  // Normaliza por 100 km: viagens longas não são punidas pelo tamanho.
  const km = Math.max(distanceKm, 1);
  const penaltyPer100 = (penalty * 100) / km;
  const score = Math.round(Math.min(100, Math.max(0, 100 - penaltyPer100)));

  // Combustível extra pelo estilo, limitado a 25% do consumo da viagem.
  const tripLiters = effectiveKmpl > 0 ? km / effectiveKmpl : 0;
  const wastedFuelLiters = Math.min(wasted, tripLiters * 0.25);


  return {
    score,
    counts,
    idleSeconds: Math.round(idleSeconds),
    wastedFuelLiters: Number(wastedFuelLiters.toFixed(3)),
    wastedCost: Number((wastedFuelLiters * pricePerLiter).toFixed(2)),
    totalEvents: events.length,
  };
}

export type EcoBand = {
  label: string;
  color: string;
  bg: string;
  stroke: string;
};

export function ecoBand(score: number | null | undefined): EcoBand {
  const s = Number(score);
  if (!Number.isFinite(s)) {
    return {
      label: "Sem dados",
      color: "text-muted-foreground",
      bg: "bg-muted",
      stroke: "hsl(var(--muted-foreground))",
    };
  }
  if (s >= 90) {
    return {
      label: "Excelente",
      color: "text-success",
      bg: "bg-success/10",
      stroke: "rgb(16 185 129)",
    };
  }
  if (s >= 75) {
    return {
      label: "Bom",
      color: "text-lime-500",
      bg: "bg-lime-500/10",
      stroke: "rgb(132 204 22)",
    };
  }
  if (s >= 60) {
    return {
      label: "Regular",
      color: "text-warning",
      bg: "bg-warning/10",
      stroke: "rgb(245 158 11)",
    };
  }
  return {
    label: "Agressivo",
    color: "text-destructive",
    bg: "bg-destructive/10",
    stroke: "rgb(239 68 68)",
  };
}

export function formatIdle(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}
