/**
 * Limites mínimos para uma viagem ser considerada válida.
 * Compartilhados entre o caminho do app (saveTrip) e o do rastreador (ingest),
 * para que a mesma viagem não seja aceita por um e descartada pelo outro.
 */
export const MIN_DISTANCE_KM = 0.1;
export const MIN_DURATION_S = 60;

/** Velocidade abaixo da qual o veículo é considerado parado (marcha lenta). */
export const IDLE_SPEED_KMH = 3;
