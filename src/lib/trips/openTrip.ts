import { haversineKm } from "@/lib/trips/geo";

/** Campos usados no cálculo de distância de uma viagem em andamento. */
export interface OpenTripDistanceInput {
  mileageAtStart?: number | null;
  lastMileage?: number | null;
  startLat?: number | null;
  startLng?: number | null;
  lastLat?: number | null;
  lastLng?: number | null;
}

/**
 * Distância da viagem em andamento: usa o odômetro quando disponível e
 * coerente, senão a distância em linha reta entre o início e o último ponto.
 * Retorna null quando não há dados suficientes.
 */
export function openTripDistanceKm(open: OpenTripDistanceInput | null | undefined): number | null {
  if (!open) return null;
  if (
    typeof open.mileageAtStart === "number" &&
    typeof open.lastMileage === "number" &&
    open.lastMileage >= open.mileageAtStart
  ) {
    return open.lastMileage - open.mileageAtStart;
  }
  if (
    typeof open.startLat === "number" &&
    typeof open.startLng === "number" &&
    typeof open.lastLat === "number" &&
    typeof open.lastLng === "number"
  ) {
    return haversineKm(open.startLat, open.startLng, open.lastLat, open.lastLng);
  }
  return null;
}
