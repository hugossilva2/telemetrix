import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Gauge, Lightbulb, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analyzeDrivingHabits } from "@/lib/coach/habits.functions";
import {
  EVENT_LABEL_PT,
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  type HabitsAnalysis,
} from "@/lib/coach/habits.types";
import { COACH_GRADE_CLASS, COACH_GRADE_LABEL } from "@/lib/coach/types";
import { getFuelKind } from "@/lib/eco/settings";
import { formatBRL, formatDecimal } from "@/lib/format";

/** Recomendações automáticas de condução geradas pela IA a partir das últimas viagens. */
export function DrivingHabitsCard({ limit = 20 }: { limit?: number }) {
  const analyze = useServerFn(analyzeDrivingHabits);

  const mutation = useMutation<HabitsAnalysis>({
    mutationFn: () => analyze({ data: { fuel: getFuelKind(), limit } }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar as recomendações."),
  });

  const result = mutation.data;

  return (
    <section className="card-surface p-4">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Recomendações automáticas</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A IA analisa o padrão das suas últimas {limit} viagens e sugere ajustes de condução.
          </p>
        </div>
        <Button
          size="sm"
          variant={result ? "outline" : "default"}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" /> Analisando…
            </>
          ) : result ? (
            <>
              <RefreshCw className="size-3.5" /> Atualizar
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> Gerar
            </>
          )}
        </Button>
      </header>

      {!result && !mutation.isPending && (
        <p className="mt-3 text-xs text-muted-foreground">
          Toque em <strong>Gerar</strong> para receber um plano de condução personalizado com base nos
          seus dados reais de telemetria.
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COACH_GRADE_CLASS[result.grade]}`}
            >
              {COACH_GRADE_LABEL[result.grade]}
            </span>
            <span className="text-sm font-semibold">{result.headline}</span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Viagens" value={`${result.stats.trips}`} />
            <Stat
              label="Eco médio"
              value={
                result.stats.avgEcoScore != null
                  ? `${Math.round(result.stats.avgEcoScore)}/100`
                  : "—"
              }
            />
            <Stat
              label="Consumo"
              value={
                result.stats.avgKmpl != null
                  ? `${formatDecimal(result.stats.avgKmpl, 1)} km/l`
                  : "—"
              }
            />
            <Stat label="Desperdício" value={formatBRL(result.stats.wastedCost)} />
          </dl>

          {result.stats.worstEvent && (
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
              <Gauge className="size-3.5" />
              Evento mais frequente:{" "}
              <strong className="text-foreground">
                {EVENT_LABEL_PT[result.stats.worstEvent] ?? result.stats.worstEvent}
              </strong>
            </p>
          )}

          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={`${rec.title}-${index}`} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_CLASS[rec.priority]}`}
                      >
                        {PRIORITY_LABEL[rec.priority]}
                      </span>
                    </div>
                    {rec.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {rec.detail}
                      </p>
                    )}
                    {rec.impact && (
                      <p className="mt-1 text-xs font-medium text-primary">{rec.impact}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {result.strength && (
            <p className="flex items-start gap-2 text-xs text-success">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {result.strength}
            </p>
          )}
          {result.focus && (
            <p className="flex items-start gap-2 text-xs text-warning">
              <Target className="mt-0.5 size-3.5 shrink-0" />
              {result.focus}
            </p>
          )}
          {result.savingsEstimate && (
            <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
              {result.savingsEstimate}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
