import { CheckCircle2, Gauge, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  SAFE_START_RPM_LIMIT,
  useSafeStart,
} from "@/lib/tracker/safeStart";

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
    </div>
  );
}
