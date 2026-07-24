export const DEFAULT_GAS_PRICE_PER_LITER = 5.89;

function isUsableNumber(value: number | null | undefined) {
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