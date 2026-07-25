import { useLiveTripTracker } from "@/hooks/useLiveTripTracker";

/**
 * Mantém o estado local da viagem (tripStore) enquanto o app estiver aberto,
 * para alimentar cronômetro, mini-mapa e consumo em tempo real na UI.
 * A persistência no banco é feita pelo webhook Flespi no servidor.
 */
export function TripRecorder() {
  useLiveTripTracker();
  return null;
}
