/**
 * Fase 3 do Modo Viagem Longa — monitoramento durante o trajeto.
 * Módulo puro: recebe o estado atual da viagem e devolve o que deve ser
 * avisado (fadiga e combustível), sem React/DOM.
 */
import { REST_INTERVAL_SECONDS } from "./longTrip";

/** Margem de segurança: avisa quando a autonomia cobre menos que isso além do restante. */
export const AUTONOMY_MARGIN_KM = 30;

export type LongTripAlertKind = "descanso" | "combustivel" | "combustivel-critico";

export interface LongTripAlert {
  kind: LongTripAlertKind;
  /** Chave única para não repetir o mesmo aviso. */
  key: string;
  title: string;
  description: string;
}

export interface LongTripLiveState {
  /** Segundos dirigindo desde o início da viagem. */
  elapsedSeconds: number;
  /** Km restantes ao longo da rota planejada (null quando desconhecido). */
  remainingKm: number | null;
  /** Autonomia estimada com o tanque atual (null quando desconhecida). */
  autonomyKm: number | null;
}

/** Índice do próximo bloco de 2 h (1 = primeira parada sugerida). */
export function nextRestIndex(elapsedSeconds: number, interval = REST_INTERVAL_SECONDS): number {
  return Math.floor(elapsedSeconds / interval) + 1;
}

/** Segundos até a próxima parada de descanso sugerida. */
export function secondsToNextRest(
  elapsedSeconds: number,
  interval = REST_INTERVAL_SECONDS,
): number {
  const next = nextRestIndex(elapsedSeconds, interval) * interval;
  return Math.max(0, next - elapsedSeconds);
}

/** Situação do combustível frente ao restante da rota. */
export function fuelStatus({
  remainingKm,
  autonomyKm,
  margin = AUTONOMY_MARGIN_KM,
}: {
  remainingKm: number | null;
  autonomyKm: number | null;
  margin?: number;
}): "ok" | "atencao" | "critico" | "desconhecido" {
  if (remainingKm == null || autonomyKm == null) return "desconhecido";
  if (autonomyKm < remainingKm) return "critico";
  if (autonomyKm < remainingKm + margin) return "atencao";
  return "ok";
}

function formatKm(km: number): string {
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/**
 * Avisos pendentes para o estado atual. As chaves são estáveis para que o
 * consumidor possa ignorar avisos já exibidos.
 */
export function pendingLongTripAlerts(
  state: LongTripLiveState,
  interval = REST_INTERVAL_SECONDS,
): LongTripAlert[] {
  const alerts: LongTripAlert[] = [];
  const blocks = Math.floor(state.elapsedSeconds / interval);
  if (blocks >= 1) {
    const hours = (blocks * interval) / 3600;
    alerts.push({
      kind: "descanso",
      key: `descanso:${blocks}`,
      title: `Hora de descansar (${hours}h dirigindo)`,
      description:
        "Pare por 10 a 15 minutos, alongue as pernas e hidrate-se antes de seguir viagem.",
    });
  }

  const fuel = fuelStatus(state);
  if (fuel === "critico") {
    alerts.push({
      kind: "combustivel-critico",
      key: `combustivel-critico:${Math.floor((state.remainingKm ?? 0) / 25)}`,
      title: "Combustível não cobre o trajeto",
      description: `Faltam ${formatKm(state.remainingKm ?? 0)} e a autonomia é de ${formatKm(
        state.autonomyKm ?? 0,
      )}. Reabasteça no próximo posto.`,
    });
  } else if (fuel === "atencao") {
    alerts.push({
      kind: "combustivel",
      key: `combustivel:${Math.floor((state.remainingKm ?? 0) / 50)}`,
      title: "Autonomia justa para o restante",
      description: `Autonomia de ${formatKm(state.autonomyKm ?? 0)} para ${formatKm(
        state.remainingKm ?? 0,
      )} restantes. Considere reabastecer.`,
    });
  }

  return alerts;
}
