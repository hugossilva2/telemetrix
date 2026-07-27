import { useCallback, useEffect, useRef, useState } from "react";

export type Parked = { lat: number; lng: number; at: number };

const PARKED_KEY = "lastParked:v1";

export function readParked(): Parked | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PARKED_KEY);
    return raw ? (JSON.parse(raw) as Parked) : null;
  } catch {
    return null;
  }
}

export function writeParked(p: Parked) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PARKED_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/**
 * Mantém o último ponto estacionado (posição no momento em que a ignição
 * passou para OFF, ou a última posição conhecida com o motor já desligado).
 * Compartilhado entre Mapa e Rastreador via localStorage.
 */
export function useParkedSpot(
  lat: number | undefined,
  lng: number | undefined,
  ignition: boolean | undefined,
): Parked | null {
  const [parked, setParked] = useState<Parked | null>(() => readParked());
  const prevIgnition = useRef<boolean | undefined>(undefined);

  const save = useCallback((p: Parked) => {
    setParked(p);
    writeParked(p);
  }, []);

  useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const prev = prevIgnition.current;
    const turnedOff = prev === true && ignition === false;
    // Sem ponto salvo (ou muito distante) e carro desligado: adota a posição atual.
    const needsSeed =
      ignition === false &&
      (!parked || Math.abs(parked.lat - lat) > 1e-5 || Math.abs(parked.lng - lng) > 1e-5);

    if (turnedOff || needsSeed) save({ lat, lng, at: Date.now() });
    prevIgnition.current = ignition;
  }, [lat, lng, ignition, parked, save]);

  return parked;
}
