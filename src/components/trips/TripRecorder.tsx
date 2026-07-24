/**
 * Gravação de viagens agora é feita 100% no servidor via webhook do Flespi
 * (src/routes/api/public/flespi-webhook.ts). O hook client-side foi
 * desativado para evitar viagens duplicadas.
 */
export function TripRecorder() {
  return null;
}
