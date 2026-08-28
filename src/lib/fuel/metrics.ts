/**
 * Indicadores de consumo derivados dos abastecimentos (módulo puro).
 * Cada ponto compara um abastecimento com o anterior: a distância percorrida
 * entre os dois dividida pelos litros do abastecimento atual dá o km/L, e o
 * valor pago dividido pela distância dá o R$/km.
 */
export interface FuelLogPoint {
  date: string;
  price_per_liter: number;
  liters_filled: number;
  total_cost: number;
  mileage_at_fill: number;
}

export interface FuelMetricPoint {
  label: string;
  date: string;
  distanceKm: number;
  kmpl: number;
  costPerKm: number;
}

export interface FuelMetricsSummary {
  points: FuelMetricPoint[];
  /** Média ponderada de km/L (distância total ÷ litros considerados). */
  avgKmpl: number | null;
  /** Média ponderada de R$/km (custo total ÷ distância total). */
  avgCostPerKm: number | null;
  /** Último km/L medido. */
  lastKmpl: number | null;
  /** Último R$/km medido. */
  lastCostPerKm: number | null;
}

/** Espera os abastecimentos em qualquer ordem; ordena por data internamente. */
export function fuelMetrics(logs: FuelLogPoint[]): FuelMetricsSummary {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const points: FuelMetricPoint[] = [];
  let totalKm = 0;
  let totalLiters = 0;
  let totalCost = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const distanceKm = Number(cur.mileage_at_fill) - Number(prev.mileage_at_fill);
    const liters = Number(cur.liters_filled);
    const cost = Number(cur.total_cost);
    if (!(distanceKm > 0) || !(liters > 0) || !(cost > 0)) continue;

    const kmpl = distanceKm / liters;
    if (!Number.isFinite(kmpl) || kmpl <= 0 || kmpl > 60) continue;

    totalKm += distanceKm;
    totalLiters += liters;
    totalCost += cost;

    points.push({
      label: new Date(cur.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      date: cur.date,
      distanceKm,
      kmpl: +kmpl.toFixed(2),
      costPerKm: +(cost / distanceKm).toFixed(3),
    });
  }

  const last = points[points.length - 1] ?? null;
  return {
    points,
    avgKmpl: totalLiters > 0 ? +(totalKm / totalLiters).toFixed(2) : null,
    avgCostPerKm: totalKm > 0 ? +(totalCost / totalKm).toFixed(3) : null,
    lastKmpl: last?.kmpl ?? null,
    lastCostPerKm: last?.costPerKm ?? null,
  };
}
