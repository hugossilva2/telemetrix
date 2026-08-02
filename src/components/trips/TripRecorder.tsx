import { useLiveTripTracker } from "@/hooks/useLiveTripTracker";
import { useRouteDeviation } from "@/hooks/useRouteDeviation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useLivePublish } from "@/hooks/useLivePublish";
import { useLongTripMonitor } from "@/hooks/useLongTripMonitor";


/**
 * Mantém o estado local da viagem (tripStore) enquanto o app estiver aberto,
 * para alimentar cronômetro, mini-mapa e consumo em tempo real na UI.
 * A persistência no banco é feita pelo webhook Flespi no servidor, com fila
 * offline (IndexedDB) como retaguarda quando não há conexão. Também espelha a
 * posição ao vivo para o modo observador.
 */
export function TripRecorder() {
  useLiveTripTracker();
  useRouteDeviation();
  useOfflineSync();
  useLivePublish();
  useLongTripMonitor();
  return null;
}
