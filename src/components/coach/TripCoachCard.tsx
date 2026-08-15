import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeTripCoaching } from "@/lib/coach/coach.functions";
import {
  COACH_GRADE_CLASS,
  COACH_GRADE_LABEL,
  normalizeGrade,
  parseTips,
  type TripCoaching,
} from "@/lib/coach/types";
import { supabase } from "@/integrations/supabase/client";
import { getFuelKind } from "@/lib/eco/settings";

async function fetchCached(tripId: string): Promise<TripCoaching | null> {
  const { data, error } = await supabase
    .from("trip_coachings")
    .select("trip_id,grade,headline,summary,tips,comparison,highlight,created_at")
    .eq("trip_id", tripId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    tripId: data.trip_id,
    grade: normalizeGrade(data.grade),
    headline: data.headline,
    summary: data.summary,
    tips: parseTips(data.tips),
    comparison: data.comparison,
    highlight: data.highlight,
    createdAt: data.created_at,
  };
}

export function TripCoachCard({ tripId }: { tripId: string }) {
  const analyze = useServerFn(analyzeTripCoaching);

  const cached = useQuery({
    queryKey: ["trip-coaching", tripId],
    queryFn: () => fetchCached(tripId),
  });

  const mutation = useMutation({
    mutationFn: (force: boolean) =>
      analyze({ data: { tripId, fuel: getFuelKind(), force } }),
    onSuccess: (data) => {
      cached.refetch();
      void data;
    },
    onError: (err: unknown) => {
      toast.error(toUserMessage(err, "Não foi possível analisar a viagem agora. Tente de novo em instantes."));
    },
  });

  const coaching = mutation.data ?? cached.data ?? null;
  const loading = mutation.isPending;

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-4" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Coach de direção</p>
            <p className="text-xs text-muted-foreground">
              Análise por IA com base na ficha do seu carro
            </p>
          </div>
        </div>
        {coaching && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${COACH_GRADE_CLASS[coaching.grade]}`}
          >
            {COACH_GRADE_LABEL[coaching.grade]}
          </span>
        )}
      </div>

      {cached.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : coaching ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">{coaching.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{coaching.summary}</p>
          </div>

          {coaching.tips.length > 0 && (
            <ul className="space-y-2">
              {coaching.tips.map((tip, i) => (
                <li key={`${tip.title}-${i}`} className="flex gap-2 rounded-xl bg-muted/40 p-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{tip.title}</p>
                    {tip.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{tip.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {coaching.comparison && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Comparativo: </span>
              {coaching.comparison}
            </p>
          )}
          {coaching.highlight && (
            <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              {coaching.highlight}
            </p>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={loading}
            onClick={() => mutation.mutate(true)}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analisando..." : "Refazer análise"}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Gere um resumo em texto, 3 dicas personalizadas e a comparação com suas viagens
            anteriores e com a meta Inmetro do Cronos.
          </p>
          <Button
            className="mt-3 w-full"
            disabled={loading}
            onClick={() => mutation.mutate(false)}
          >
            <Sparkles className={`size-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Analisando viagem..." : "Analisar com IA"}
          </Button>
        </div>
      )}
    </div>
  );
}
