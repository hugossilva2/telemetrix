import { useState } from "react";
import { CheckCircle2, ChevronDown, Gauge, History, ShieldAlert, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  SAFE_START_RPM_LIMIT,
  useSafeStart,
} from "@/lib/tracker/safeStart";
import { useSafeStartHistory } from "@/lib/tracker/safeStartHistory";

interface Props {
  ignitionOn?: boolean;
  engineRpm?: number;
}

/**
 * Indicador de "partida segura": vermelho enquanto o óleo ainda não circulou
 * (RPM precisa estabilizar abaixo de 1000), verde quando pode sair.
 */
export function SafeStartCard({ ignitionOn, engineRpm }: Props) {
  const { phase, progress, remainingSeconds, offMinutes, rpm } = useSafeStart(
    ignitionOn,
    engineRpm,
  );
  const { history, clear } = useSafeStartHistory();
  const [showHistory, setShowHistory] = useState(false);

  if (phase === "off" || phase === "not-required") return null;

  const ok = phase === "ready";
  const revving = phase === "revving";

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 transition-colors ${
        ok
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-11 place-items-center rounded-full ${
            ok
              ? "bg-emerald-500/20 text-emerald-500"
              : "bg-destructive/20 text-destructive animate-pulse"
          }`}
        >
          {ok ? <CheckCircle2 className="size-5" /> : <ShieldAlert className="size-5" />}
        </span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Partida segura
          </div>
          <div className={`text-base font-semibold ${ok ? "text-emerald-500" : "text-destructive"}`}>
            {ok ? "Pronto para sair" : revving ? "Reduza o acelerador" : "Aguarde o óleo circular"}
          </div>
        </div>
      </div>

      {!ok && (
        <>
          <Progress value={progress * 100} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {revving
              ? `Mantenha abaixo de ${SAFE_START_RPM_LIMIT} rpm para liberar.`
              : `Liberando em ${remainingSeconds}s com o motor em marcha lenta.`}
          </p>
        </>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Gauge className="size-3.5" />
        <span className="tabular-nums">{rpm == null ? "—" : `${Math.round(rpm)} rpm`}</span>
        {offMinutes != null && (
          <>
            <span aria-hidden>•</span>
            <span>parado por {offMinutes} min</span>
          </>
        )}
      </div>

      <div className="mt-3 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center gap-2 text-xs text-muted-foreground"
        >
          <History className="size-3.5" />
          <span>Histórico de partidas ({history.length})</span>
          <ChevronDown
            className={`ml-auto size-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`}
          />
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1.5">
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma partida registrada ainda.</p>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-xs"
              >
                <span className="tabular-nums text-muted-foreground">
                  {new Date(h.startedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-muted-foreground">
                  {h.offMinutes == null ? "—" : `${h.offMinutes} min parado`}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  min {h.minRpm == null ? "—" : `${Math.round(h.minRpm)} rpm`}
                </span>
                <span
                  className={`ml-auto font-medium ${
                    h.ready
                      ? "text-emerald-500"
                      : h.required
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {h.ready ? "pronto" : h.required ? "não pronto" : "n/a"}
                </span>
              </div>
            ))}
            {history.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground"
              >
                <Trash2 className="size-3.5" /> Limpar histórico
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
