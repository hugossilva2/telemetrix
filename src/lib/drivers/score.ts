import type { EcoEventType } from "@/lib/eco/detect";
import { expectedKmpl, type FuelKind } from "@/lib/vehicles/specs";


export interface DriverTripRow {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
  eco_score: number | null;
  harsh_brake_count: number | null;
  harsh_accel_count: number | null;
  harsh_corner_count: number | null;
  overspeed_count: number | null;
  high_rpm_count: number | null;
  idle_seconds: number | null;
  wasted_fuel_liters: number | null;
  wasted_cost: number | null;
  max_speed_kmh: number | null;
}

export interface DriverSafeStartRow {
  started_at: string;
  required: boolean;
  ready: boolean;
  min_rpm: number | null;
}

export interface DriverPillars {
  /** direção segura (eco score ponderado pela distância) */
  safety: number | null;
  /** eficiência de consumo (quanto menos desperdício, maior) */
  efficiency: number | null;
  /** % de partidas seguras respeitadas */
  safeStart: number | null;
}

export interface DriverStats {
  trips: number;
  distanceKm: number;
  drivingSeconds: number;
  liters: number;
  cost: number;
  kmPerLiter: number | null;
  /** meta de consumo (km/l) da ficha técnica para o perfil de velocidade */
  targetKmPerLiter: number;
  /** consumo real ÷ meta (1 = bateu a meta Inmetro) */
  consumptionRatio: number | null;
  avgSpeedKmh: number | null;
  costPerKm: number | null;

  wastedLiters: number;
  wastedCost: number;
  idleSeconds: number;
  maxSpeedKmh: number | null;
  counts: Record<EcoEventType, number>;
  totalEvents: number;
  safeStartsTotal: number;
  safeStartsRequired: number;
  safeStartsReady: number;
}

export interface DriverScore {
  score: number | null;
  pillars: DriverPillars;
  stats: DriverStats;
}

const num = (v: number | null | undefined) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Limite de desperdício considerado "muito ruim" (25% do combustível da viagem). */
const MAX_WASTE_SHARE = 0.25;

export const PILLAR_WEIGHTS = { safety: 0.6, efficiency: 0.3, safeStart: 0.1 };

export function computeDriverScore(
  trips: DriverTripRow[],
  safeStarts: DriverSafeStartRow[],
  options: { fuel?: FuelKind } = {},
): DriverScore {

  const counts: Record<EcoEventType, number> = {
    harsh_brake: 0,
    harsh_accel: 0,
    harsh_corner: 0,
    overspeed: 0,
    high_rpm: 0,
  };

  let distanceKm = 0;
  let drivingSeconds = 0;
  let liters = 0;
  let cost = 0;
  let wastedLiters = 0;
  let wastedCost = 0;
  let idleSeconds = 0;
  let maxSpeedKmh: number | null = null;
  let ecoWeighted = 0;
  let ecoWeight = 0;

  for (const t of trips) {
    const km = num(t.distance_km);
    distanceKm += km;
    liters += num(t.fuel_liters);
    cost += num(t.estimated_cost);
    wastedLiters += num(t.wasted_fuel_liters);
    wastedCost += num(t.wasted_cost);
    idleSeconds += num(t.idle_seconds);
    counts.harsh_brake += num(t.harsh_brake_count);
    counts.harsh_accel += num(t.harsh_accel_count);
    counts.harsh_corner += num(t.harsh_corner_count);
    counts.overspeed += num(t.overspeed_count);
    counts.high_rpm += num(t.high_rpm_count);

    if (t.max_speed_kmh != null) {
      maxSpeedKmh = Math.max(maxSpeedKmh ?? 0, Number(t.max_speed_kmh));
    }
    if (t.end_time) {
      drivingSeconds += Math.max(
        0,
        (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 1000,
      );
    }
    if (t.eco_score != null) {
      const w = Math.max(km, 1);
      ecoWeighted += Number(t.eco_score) * w;
      ecoWeight += w;
    }
  }

  const safeStartsRequired = safeStarts.filter((s) => s.required).length;
  const safeStartsReady = safeStarts.filter((s) => s.required && s.ready).length;

  const safety = ecoWeight > 0 ? Math.round(ecoWeighted / ecoWeight) : null;

  const kmPerLiter = liters > 0 ? distanceKm / liters : null;
  const avgSpeedKmh = drivingSeconds > 0 ? (distanceKm / drivingSeconds) * 3600 : null;
  const targetKmPerLiter = expectedKmpl({ fuel: options.fuel ?? "misto", avgSpeedKmh });
  const consumptionRatio = kmPerLiter != null ? kmPerLiter / targetKmPerLiter : null;

  const wasteShare = liters > 0 ? wastedLiters / liters : null;
  const wasteScore =
    wasteShare == null
      ? null
      : Math.max(0, Math.min(100, 100 - (wasteShare / MAX_WASTE_SHARE) * 100));

  // Consumo real x meta Inmetro do veículo: bater a meta = 100.
  const consumptionScore =
    consumptionRatio == null
      ? null
      : Math.max(0, Math.min(100, 50 + (consumptionRatio - 1) * 250));

  const efficiencyParts = [wasteScore, consumptionScore].filter(
    (v): v is number => v != null,
  );
  const efficiency = efficiencyParts.length
    ? Math.round(efficiencyParts.reduce((a, b) => a + b, 0) / efficiencyParts.length)
    : null;

  const safeStart =
    safeStartsRequired > 0 ? Math.round((safeStartsReady / safeStartsRequired) * 100) : null;

  const pillars: DriverPillars = { safety, efficiency, safeStart };


  let sum = 0;
  let weight = 0;
  (Object.keys(PILLAR_WEIGHTS) as (keyof DriverPillars)[]).forEach((k) => {
    const v = pillars[k];
    if (v == null) return;
    sum += v * PILLAR_WEIGHTS[k];
    weight += PILLAR_WEIGHTS[k];
  });

  const score = weight > 0 ? Math.round(sum / weight) : null;

  return {
    score,
    pillars,
    stats: {
      trips: trips.length,
      distanceKm,
      drivingSeconds,
      liters,
      cost,
      kmPerLiter: liters > 0 ? distanceKm / liters : null,
      costPerKm: distanceKm > 0 ? cost / distanceKm : null,
      wastedLiters,
      wastedCost,
      idleSeconds,
      maxSpeedKmh,
      counts,
      totalEvents:
        counts.harsh_brake +
        counts.harsh_accel +
        counts.harsh_corner +
        counts.overspeed +
        counts.high_rpm,
      safeStartsTotal: safeStarts.length,
      safeStartsRequired,
      safeStartsReady,
    },
  };
}

export interface DriverBadge {
  id: string;
  label: string;
  description: string;
  tone: "emerald" | "lime" | "amber" | "violet" | "sky";
}

export function driverBadges({ score, pillars, stats }: DriverScore): DriverBadge[] {
  const badges: DriverBadge[] = [];
  if (stats.trips === 0) return badges;

  if (score != null && score >= 90) {
    badges.push({
      id: "exemplar",
      label: "Direção exemplar",
      description: "Nota geral acima de 90",
      tone: "emerald",
    });
  }
  if (stats.counts.harsh_brake === 0) {
    badges.push({
      id: "no-brake",
      label: "Zero freada brusca",
      description: "Nenhuma frenagem agressiva registrada",
      tone: "sky",
    });
  }
  if (stats.counts.harsh_accel === 0) {
    badges.push({
      id: "light-foot",
      label: "Pé leve",
      description: "Nenhuma aceleração agressiva registrada",
      tone: "lime",
    });
  }
  if (stats.counts.overspeed === 0) {
    badges.push({
      id: "no-speeding",
      label: "Sem excesso",
      description: "Nenhum excesso de velocidade registrado",
      tone: "violet",
    });
  }
  if (pillars.efficiency != null && pillars.efficiency >= 90) {
    badges.push({
      id: "economy",
      label: "Economia máxima",
      description: "Praticamente zero combustível desperdiçado",
      tone: "emerald",
    });
  }
  if (pillars.safeStart === 100 && stats.safeStartsRequired > 0) {
    badges.push({
      id: "safe-start",
      label: "Partida perfeita",
      description: "Respeitou 100% das partidas seguras",
      tone: "amber",
    });
  }
  return badges;
}

export const BADGE_CLASSES: Record<DriverBadge["tone"], string> = {
  emerald: "bg-success/10 text-success border-success/30",
  lime: "bg-lime-500/10 text-lime-500 border-lime-500/30",
  amber: "bg-warning/10 text-warning border-warning/30",
  violet: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  sky: "bg-chart-3/10 text-chart-3 border-chart-3/30",
};

export function monthlyScoreSeries(trips: DriverTripRow[]) {
  const map = new Map<string, { sum: number; weight: number }>();
  for (const t of trips) {
    if (t.eco_score == null) continue;
    const d = new Date(t.start_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const w = Math.max(num(t.distance_km), 1);
    const cur = map.get(key) ?? { sum: 0, weight: 0 };
    cur.sum += Number(t.eco_score) * w;
    cur.weight += w;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, v]) => {
      const [y, m] = key.split("-");
      return {
        key,
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
        }),
        score: Math.round(v.sum / v.weight),
      };
    });
}
