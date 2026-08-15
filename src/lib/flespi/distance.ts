/**
 * Distância acumulada ping a ping da viagem em andamento.
 *
 * Usada como fallback quando o rastreador não envia `vehicle.mileage`: sem ela,
 * uma viagem circular (ir ao mercado e voltar) mediria ~0 km em linha reta.
 */

export const ACCUM_MIN_STEP_KM = 0.01; // piso de 10 m: abaixo disso é jitter de GPS parado
export const ACCUM_MAX_SPEED_KMH = 200; // teto: salto acima disso é reaquisição de sinal

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Incremento de distância entre a última posição conhecida e a nova.
 * Devolve 0 quando faltam coordenadas, quando o trecho é ruído de GPS (< 10 m)
 * ou quando o salto implicaria velocidade irreal (> 200 km/h no intervalo).
 */
export function accumIncrementKm(input: {
  prevLat: number | null | undefined;
  prevLng: number | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  dtSeconds: number | null | undefined;
}): number {
  const { prevLat, prevLng, lat, lng } = input;
  if (
    typeof prevLat !== "number" ||
    typeof prevLng !== "number" ||
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return 0;
  }
  const km = haversineKm(prevLat, prevLng, lat, lng);
  if (!Number.isFinite(km) || km < ACCUM_MIN_STEP_KM) return 0;

  const dt = input.dtSeconds;
  if (typeof dt === "number" && dt > 0) {
    const impliedSpeed = km / (dt / 3600);
    if (impliedSpeed > ACCUM_MAX_SPEED_KMH) return 0;
  }
  return km;
}

/**
 * Distância final da viagem, por ordem de confiança:
 * 1) delta de odômetro, 2) acumulado ping a ping, 3) linha reta início→fim.
 */
export function resolveTripDistanceKm(input: {
  mileageStart: number | null | undefined;
  mileageEnd: number | null | undefined;
  accumKm: number | null | undefined;
  startLat: number | null | undefined;
  startLng: number | null | undefined;
  endLat: number | null | undefined;
  endLng: number | null | undefined;
}): number {
  const { mileageStart, mileageEnd } = input;
  if (
    typeof mileageEnd === "number" &&
    typeof mileageStart === "number" &&
    mileageEnd > mileageStart
  ) {
    return mileageEnd - mileageStart;
  }

  const accum = Number(input.accumKm ?? 0);
  if (Number.isFinite(accum) && accum > 0) return accum;

  const { startLat, startLng, endLat, endLng } = input;
  if (
    typeof startLat === "number" &&
    typeof startLng === "number" &&
    typeof endLat === "number" &&
    typeof endLng === "number"
  ) {
    return haversineKm(startLat, startLng, endLat, endLng);
  }
  return 0;
}
