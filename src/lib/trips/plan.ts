import { useSyncExternalStore } from "react";
import { haversineKm } from "./geo";

/** Parada de uma rota planejada. */
export interface PlanStop {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

/** Rota planejada e salva localmente (sem tocar no banco). */
export interface TripPlan {
  createdAt: string;
  origin: PlanStop;
  stops: PlanStop[];
  destination: PlanStop;
  distanceKm: number;
  durationSeconds: number;
  fuelLiters: number;
  cost: number;
  /** Pontos da rota decodificados, usados para detectar desvio. */
  path: Array<[number, number]>;
  /** Monitoramento de desvio ativo */
  monitoring: boolean;
  /** Nível do tanque (%) informado manualmente, quando não há leitura do veículo. */
  fuelPercent?: number | null;
  /** Considerar ida e volta na estimativa de gastos. */
  roundTrip?: boolean;
  /** Pedágios informados manualmente (R$). */
  tollCost?: number | null;
  /** Preço do litro usado na estimativa (R$/L). */
  pricePerLiter?: number | null;
  /** Consumo usado na estimativa (km/L). */
  kmpl?: number | null;
}


const KEY = "tripPlan:v1";

function read(): TripPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TripPlan) : null;
  } catch {
    return null;
  }
}

let snapshot: TripPlan | null = read();
const listeners = new Set<() => void>();

export const tripPlanStore = {
  get: () => snapshot,
  set(plan: TripPlan | null) {
    snapshot = plan;
    if (typeof window !== "undefined") {
      if (plan) window.localStorage.setItem(KEY, JSON.stringify(plan));
      else window.localStorage.removeItem(KEY);
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useTripPlan(): TripPlan | null {
  return useSyncExternalStore(
    tripPlanStore.subscribe,
    tripPlanStore.get,
    () => null,
  );
}

/** Decodifica uma polyline do Google em pares [lat, lng]. */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Menor distância (km) do ponto até a rota planejada. */
export function distanceToPathKm(
  lat: number,
  lng: number,
  path: Array<[number, number]>,
): number | null {
  if (!path.length) return null;
  let min = Infinity;
  for (const [pLat, pLng] of path) {
    const d = haversineKm(lat, lng, pLat, pLng);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

/** Quilômetros restantes ao longo da rota, a partir do ponto mais próximo. */
export function remainingPathKm(
  lat: number,
  lng: number,
  path: Array<[number, number]>,
): number | null {
  if (path.length < 2) return null;
  let bestIdx = 0;
  let min = Infinity;
  path.forEach(([pLat, pLng], i) => {
    const d = haversineKm(lat, lng, pLat, pLng);
    if (d < min) {
      min = d;
      bestIdx = i;
    }
  });
  let total = 0;
  for (let i = bestIdx; i < path.length - 1; i++) {
    total += haversineKm(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
  }
  return total;
}
