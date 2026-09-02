import { Link } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, Play, Users } from "lucide-react";
import { useMemo } from "react";
import { useAccountMode } from "@/lib/account/profile";
import { isTeachingMode } from "@/lib/account/mode";
import { useLessons, useMySchool, useStudents } from "@/lib/school/api";
import { lessonsOfDay } from "@/lib/school/lessons";
import { useStartLesson } from "@/lib/school/actions";
import { SchoolSetupCard } from "@/components/school/SchoolSetupCard";

/** Painel do instrutor/autoescola: aulas de hoje e atalhos. */
export function LessonsTodayCard() {
  const { mode, loading } = useAccountMode();
  const enabled = isTeachingMode(mode);
  const { school, isLoading } = useMySchool();
  const lessons = useLessons(enabled ? school?.id : null);
  const students = useStudents(enabled ? school?.id : null);
  const startLesson = useStartLesson();

  const today = useMemo(() => lessonsOfDay(lessons.data ?? []), [lessons.data]);
  if (!enabled || loading) return null;
  if (!isLoading && !school) return <SchoolSetupCard />;

  const inProgress = today.find((l) => l.status === "em_andamento");
  const next = today.find((l) => l.status === "agendada");
  const activeStudents = (students.data ?? []).filter((s) => s.active).length;

  return (
    <section className="card-surface border-primary/30 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="size-4 text-primary" />
          {school?.name ?? "Aulas"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {today.length} aula{today.length === 1 ? "" : "s"} hoje
        </span>
      </header>

      {inProgress ? (
        <Link to="/aulas" className="mt-3 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
          <span className="relative grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Play className="relative size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">Em andamento</span>
            <span className="block truncate text-sm font-semibold">{inProgress.student?.name}</span>
          </span>
        </Link>
      ) : next ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] text-muted-foreground">Próxima aula</span>
            <span className="block truncate text-sm font-semibold">
              {new Date(next.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {next.student?.name}
            </span>
          </span>
          <button
            type="button"
            onClick={() => startLesson.mutate(next)}
            disabled={startLesson.isPending}
            className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Play className="size-3.5" /> Iniciar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Nenhuma aula restante hoje.</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to="/aulas" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/35 text-xs font-semibold">
          <CalendarDays className="size-4 text-primary" /> Agenda
        </Link>
        <Link to="/alunos" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/35 text-xs font-semibold">
          <Users className="size-4 text-primary" /> {activeStudents} aluno{activeStudents === 1 ? "" : "s"}
        </Link>
      </div>
    </section>
  );
}
