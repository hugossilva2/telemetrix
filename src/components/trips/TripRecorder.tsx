import { useLiveTripTracker } from "@/hooks/useLiveTripTracker";
import { useRouteDeviation } from "@/hooks/useRouteDeviation";

/**
 * Mantém o estado local da viagem (tripStore) enquanto o app estiver aberto,
 * para alimentar cronômetro, mini-mapa e consumo em tempo real na UI.
 * A persistência no banco é feita pelo webhook Flespi no servidor.
 */
export function TripRecorder() {
  useLiveTripTracker();
  useRouteDeviation();
  return null;
}
