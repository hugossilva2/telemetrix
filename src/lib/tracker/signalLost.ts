/**
 * Regras de "sinal perdido" compartilhadas entre o heartbeat (pg_cron) e a
 * tela de diagnóstico, para que o app explique o alerta com os mesmos números.
 */

/** Com ignição ligada o rastreador reporta a cada poucos segundos. */
export const SIGNAL_LOST_THRESHOLD_MIN = 15;
/** Estacionado, o FMC003 dorme e manda só um keep-alive por hora. */
export const PARKED_SIGNAL_LOST_THRESHOLD_MIN = 180;
/** Evita repetir o alerta em sequência quando o keep-alive limpa a flag. */
export const REALERT_COOLDOWN_MIN = 360;

export type SignalHealth = "ok" | "atrasado" | "perdido" | "sem-dado";

export function thresholdMinFor(ignitionOn: boolean | null | undefined): number {
  return ignitionOn === true ? SIGNAL_LOST_THRESHOLD_MIN : PARKED_SIGNAL_LOST_THRESHOLD_MIN;
}

/**
 * Classifica a saúde do sinal a partir da idade da última mensagem.
 * "atrasado" começa na metade do limite — é o aviso amarelo do painel.
 */
export function signalHealth({
  lastMessageMs,
  nowMs,
  ignitionOn,
}: {
  lastMessageMs: number | null;
  nowMs: number;
  ignitionOn: boolean | null | undefined;
}): { health: SignalHealth; ageMs: number | null; thresholdMin: number } {
  const thresholdMin = thresholdMinFor(ignitionOn);
  if (lastMessageMs == null || !Number.isFinite(lastMessageMs)) {
    return { health: "sem-dado", ageMs: null, thresholdMin };
  }
  const ageMs = Math.max(0, nowMs - lastMessageMs);
  const limitMs = thresholdMin * 60_000;
  if (ageMs >= limitMs) return { health: "perdido", ageMs, thresholdMin };
  if (ageMs >= limitMs / 2) return { health: "atrasado", ageMs, thresholdMin };
  return { health: "ok", ageMs, thresholdMin };
}

export const SIGNAL_HEALTH_LABEL: Record<SignalHealth, string> = {
  ok: "Sinal em dia",
  atrasado: "Sinal atrasado",
  perdido: "Sinal perdido",
  "sem-dado": "Sem dados",
};

export const SIGNAL_HEALTH_CLASS: Record<SignalHealth, string> = {
  ok: "border-success/40 bg-success/10 text-success",
  atrasado: "border-warning/40 bg-warning/10 text-warning",
  perdido: "border-destructive/40 bg-destructive/10 text-destructive",
  "sem-dado": "border-border bg-muted/40 text-muted-foreground",
};

/** Motivo em português para um evento `signal_lost` gravado no banco. */
export function signalLostReason(metadata: unknown): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const parked = m["parked"] === true;
  const threshold = Number(m["threshold_min"]);
  const last = typeof m["last_message_at"] === "string" ? (m["last_message_at"] as string) : null;
  const minutes = Number.isFinite(threshold)
    ? threshold
    : parked
      ? PARKED_SIGNAL_LOST_THRESHOLD_MIN
      : SIGNAL_LOST_THRESHOLD_MIN;
  const base = parked
    ? `Carro estacionado e sem keep-alive por mais de ${minutes} min`
    : `Motor ligado e sem mensagem por mais de ${minutes} min`;
  if (!last) return base + ".";
  const when = new Date(last).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${base}. Última mensagem em ${when}.`;
}

/** Causas prováveis, para orientar o usuário na tela de diagnóstico. */
export const SIGNAL_LOST_CAUSES = [
  "Rastreador sem energia (fusível, bateria do carro ou cabo solto).",
  "Chip M2M sem crédito, sem dados ou sem cobertura no local.",
  "Carro em garagem/subsolo — sem sinal de celular nem GPS.",
  "Rastreador em modo de economia profundo depois de dias parado.",
] as const;
