import { useLiveTripTracker } from "@/hooks/useLiveTripTracker";
import { useRouteDeviation } from "@/hooks/useRouteDeviation";
import { useOfflineSync } from "@/hooks/useOfflineSync";

/**
 * Mantém o estado local da viagem (tripStore) enquanto o app estiver aberto,
 * para alimentar cronômetro, mini-mapa e consumo em tempo real na UI.
 * A persistência no banco é feita pelo webhook Flespi no servidor, com fila
 * offline (IndexedDB) como retaguarda quando não há conexão.
 */
export function TripRecorder() {
  useLiveTripTracker();
  useRouteDeviation();
  useOfflineSync();
  return null;
}
