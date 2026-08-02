import { useEffect, useState } from "react";

export interface MyLocation {
  lat: number;
  lng: number;
  accuracyM?: number;
  at: number;
}

export interface UseMyLocationResult {
  position: MyLocation | null;
  error: string | null;
  supported: boolean;
}

/**
 * Posição do celular (GPS do aparelho) via Geolocation API.
 * Usada para comparar onde estou com onde o carro está.
 */
export function useMyLocation(enabled = true): UseMyLocationResult {
  const [position, setPosition] = useState<MyLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!enabled || !supported) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? undefined,
          at: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada"
            : "Não foi possível obter sua localização",
        );
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, supported]);

  return { position, error, supported };
}
