import { Link } from "@tanstack/react-router";
import { ChevronRight, Leaf } from "lucide-react";
import type { LessonRecord } from "@/lib/school/api";
import { LESSON_STATUS_CLASSES, LESSON_STATUS_LABEL } from "@/lib/school/lessons";
import { formatBRL } from "@/lib/format";

export function LessonListItem({
  lesson,
  hideStudent,
  studentView,
}: {
  lesson: LessonRecord;
  hideStudent?: boolean;
  studentView?: boolean;
}) {
  const d = new Date(lesson.scheduled_at);
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const inner = (
    <>
      <div className="w-14 shrink-0 text-center">
        <p className="text-[10px] uppercase text-muted-foreground">{day.replace(".", "")}</p>
        <p className="font-mono text-sm font-semibold">{time}</p>
      </div>
      <div className="min-w-0 flex-1">
        {!hideStudent && <p className="truncate text-sm font-semibold">{lesson.student?.name ?? "Aluno"}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${LESSON_STATUS_CLASSES[lesson.status]}`}>
            {LESSON_STATUS_LABEL[lesson.status]}
          </span>
          <span className="text-[11px] text-muted-foreground">{lesson.duration_min} min</span>
          {lesson.trip?.eco_score != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-primary">
              <Leaf className="size-3" /> {Math.round(lesson.trip.eco_score)}
            </span>
          )}
          {!studentView && lesson.price != null && (
            <span className={`text-[11px] ${lesson.paid ? "text-success" : "text-warning"}`}>
              {formatBRL(lesson.price)} {lesson.paid ? "pago" : "pendente"}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );
  if (studentView) {
    return <li className="flex items-center gap-3 px-4 py-3">{inner}</li>;
  }
  return (
    <li>
      <Link to="/aulas/$id" params={{ id: lesson.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
        {inner}
      </Link>
    </li>
  );
}
