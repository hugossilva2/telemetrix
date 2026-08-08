export const DEFAULT_GAS_PRICE_PER_LITER = 5.89;

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function estimateTripCost({
  estimatedCost,
  fuelLiters,
  pricePerLiter = DEFAULT_GAS_PRICE_PER_LITER,
}: {
  estimatedCost?: number | null;
  fuelLiters?: number | null;
  pricePerLiter?: number | null;
}) {
  if (isUsableNumber(estimatedCost)) return estimatedCost;

  const price =
    isUsableNumber(pricePerLiter) && pricePerLiter > 0
      ? pricePerLiter
      : DEFAULT_GAS_PRICE_PER_LITER;

  if (!isUsableNumber(fuelLiters)) return null;

  return fuelLiters * price;
}

export interface PlanCostInput {
  distanceKm?: number | null;
  kmpl?: number | null;
  pricePerLiter?: number | null;
  roundTrip?: boolean;
  tollCost?: number | null;
}

export interface PlanCostResult {
  /** Distância total considerada (dobrada quando ida e volta). */
  distanceKm: number;
  fuelLiters: number;
  fuelCost: number;
  tollCost: number;
  total: number;
  costPerKm: number | null;
}

function safe(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Estimativa de gastos de uma rota planejada. */
export function estimatePlanCost({
  distanceKm,
  kmpl,
  pricePerLiter,
  roundTrip = false,
  tollCost,
}: PlanCostInput): PlanCostResult {
  const oneWay = Math.min(safe(distanceKm), 100_000);
  const total = roundTrip ? oneWay * 2 : oneWay;

  const consumption = Math.min(safe(kmpl, 10) || 10, 100);
  const price = Math.min(safe(pricePerLiter, DEFAULT_GAS_PRICE_PER_LITER) || DEFAULT_GAS_PRICE_PER_LITER, 100);
  const tolls = Math.min(safe(tollCost), 100_000);

  const fuelLiters = consumption > 0 ? total / consumption : 0;
  const fuelCost = fuelLiters * price;
  const grand = fuelCost + tolls;

  return {
    distanceKm: total,
    fuelLiters: Number(fuelLiters.toFixed(2)),
    fuelCost: Number(fuelCost.toFixed(2)),
    tollCost: Number(tolls.toFixed(2)),
    total: Number(grand.toFixed(2)),
    costPerKm: total > 0 ? Number((grand / total).toFixed(2)) : null,
  };
}