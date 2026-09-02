import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import { invalidateSchool, type LessonRecord } from "./api";
import { matchTripForLesson } from "./lessons";

/** Inicia a aula (marca hora de início). */
export function useStartLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: LessonRecord) => {
      const { error } = await supabase
        .from("lessons")
        .update({ status: "em_andamento", started_at: new Date().toISOString() })
        .eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula iniciada. Boa aula!");
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível iniciar a aula.")),
  });
}

/**
 * Encerra a aula e tenta vincular a viagem gravada no mesmo horário.
 * Se o carro ainda estiver ligado, a viagem ainda não fechou: dá para vincular depois.
 */
export function useEndLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: LessonRecord): Promise<{ linked: boolean }> => {
      const endedAt = new Date().toISOString();
      const startedAt = lesson.started_at ?? lesson.scheduled_at;
      const from = new Date(new Date(startedAt).getTime() - 30 * 60_000).toISOString();
      const { data: trips } = await supabase
        .from("trips")
        .select("id,start_time,end_time")
        .gte("start_time", from)
        .not("end_time", "is", null)
        .order("start_time", { ascending: false })
        .limit(20);
      const match = lesson.trip_id ? null : matchTripForLesson(trips ?? [], startedAt, endedAt);
      const { error } = await supabase
        .from("lessons")
        .update({
          status: "concluida",
          ended_at: endedAt,
          started_at: lesson.started_at ?? startedAt,
          ...(match ? { trip_id: match.id } : {}),
        })
        .eq("id", lesson.id);
      if (error) throw error;
      return { linked: !!match || !!lesson.trip_id };
    },
    onSuccess: ({ linked }) => {
      toast.success(
        linked ? "Aula encerrada e trajeto vinculado." : "Aula encerrada.",
        linked ? undefined : { description: "Quando a viagem fechar, vincule-a na aula para ver o trajeto e o Eco Score." },
      );
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível encerrar a aula.")),
  });
}
