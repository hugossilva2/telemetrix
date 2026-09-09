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
  is_full_tank: boolean;
  fuel_type: string;
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

/**
 * Espera os abastecimentos em qualquer ordem; ordena por data internamente.
 * Cada trecho vai de um tanque cheio ao seguinte e soma os litros/valores dos
 * abastecimentos parciais do meio — assim o km/L não fica inflado.
 */
export function fuelMetrics(logs: FuelLogPoint[]): FuelMetricsSummary {
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points: FuelMetricPoint[] = [];
  let totalKm = 0;
  let totalLiters = 0;
  let totalCost = 0;

  let prevFull: FuelLogPoint | null = null;
  let pendingLiters = 0;
  let pendingCost = 0;

  for (const cur of sorted) {
    const sameFuel = prevFull ? prevFull.fuel_type === cur.fuel_type : true;

    if (!cur.is_full_tank) {
      if (prevFull && sameFuel) {
        pendingLiters += Math.max(0, Number(cur.liters_filled) || 0);
        pendingCost += Math.max(0, Number(cur.total_cost) || 0);
      }
      continue;
    }

    if (prevFull && sameFuel) {
      const distanceKm = Number(cur.mileage_at_fill) - Number(prevFull.mileage_at_fill);
      const liters = pendingLiters + (Number(cur.liters_filled) || 0);
      const cost = pendingCost + (Number(cur.total_cost) || 0);
      const kmpl = distanceKm > 0 && liters > 0 ? distanceKm / liters : NaN;

      if (distanceKm > 0 && liters > 0 && cost > 0 && Number.isFinite(kmpl) && kmpl <= 60) {
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
    }

    prevFull = cur;
    pendingLiters = 0;
    pendingCost = 0;
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
