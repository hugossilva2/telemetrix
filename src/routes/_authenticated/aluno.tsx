import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, GraduationCap, Leaf, Route as RouteIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useMyEnrollments, useMyLessons } from "@/lib/school/api";
import { CHECKLIST_ITEMS, CHECKLIST_MARK_LABEL, parseChecklist, studentProgress } from "@/lib/school/lessons";
import { formatDateTime } from "@/lib/trips/format";
import { formatDecimal } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/aluno")({
  head: () => ({
    meta: [
      { title: "Meu progresso · Telemetrix" },
      { name: "description", content: "Suas aulas feitas e próximas, trajetos, pontuação de direção e observações do instrutor." },
      { property: "og:title", content: "Meu progresso · Telemetrix" },
      { property: "og:description", content: "Área do aluno." },
    ],
  }),
  component: AlunoAreaPage,
});

function AlunoAreaPage() {
  const { enrollments, isLoading } = useMyEnrollments();
  const lessons = useMyLessons(enrollments.length > 0);
  const contracted = enrollments.reduce((s, e) => s + e.contracted_lessons, 0);
  const all = lessons.data ?? [];
  const progress = useMemo(
    () =>
      studentProgress(
        all.map((l) => ({ ...l, trip_eco_score: l.trip?.eco_score ?? null })),
        contracted,
      ),
    [all, contracted],
  );
  const now = Date.now();
  const upcoming = all
    .filter((l) => l.status === "agendada" && new Date(l.scheduled_at).getTime() >= now - 3_600_000)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const done = all.filter((l) => l.status === "concluida");
  const school = enrollments[0]?.org;

  if (!isLoading && enrollments.length === 0) {
    return (
      <AppShell title="Meu progresso" subtitle="Área do aluno">
        <section className="card-surface p-6 text-center">
          <GraduationCap className="mx-auto size-8 text-primary" />
          <p className="mt-2 text-sm font-semibold">Nenhuma matrícula encontrada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Peça ao seu instrutor o link de convite e abra-o com esta conta.
          </p>
          <Link to="/inicio" className="mt-3 inline-block text-xs font-semibold text-primary">
            Ir para o painel
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Meu progresso" subtitle={school ? school.name : "Área do aluno"}>
      <section className="card-surface p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Aulas realizadas</p>
            <p className="font-mono text-4xl font-bold">
              {progress.done}
              {contracted > 0 && <span className="text-base font-medium text-muted-foreground">/{contracted}</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pontuação de direção</p>
            <p className="font-mono text-3xl font-bold text-primary">{progress.avgEco ?? "—"}</p>
          </div>
        </div>
        {contracted > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
          </div>
        )}
        {progress.weakSpots.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Para treinar</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {progress.weakSpots.map((w) => (
                <span key={w.id} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
                  {CHECKLIST_ITEMS.find((c) => c.id === w.id)?.label ?? w.id}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" /> Próximas aulas
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Nenhuma aula agendada.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {upcoming.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/35 p-3">
                <span className="text-sm font-semibold">{formatDateTime(l.scheduled_at)}</span>
                <span className="text-xs text-muted-foreground">{l.duration_min} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface p-0">
        <h2 className="px-4 pt-4 text-sm font-semibold">Aulas feitas</h2>
        {done.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">Sua primeira aula ainda vai aparecer aqui.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60">
            {done.map((l) => {
              const checks = parseChecklist(l.checklist);
              return (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{formatDateTime(l.scheduled_at)}</p>
                    {l.trip?.eco_score != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        <Leaf className="size-3" /> {Math.round(l.trip.eco_score)}
                      </span>
                    )}
                  </div>
                  {l.trip && (
                    <Link
                      to="/viagens/$id"
                      params={{ id: l.trip.id }}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary"
                    >
                      <RouteIcon className="size-3" />
                      {l.trip.distance_km != null ? `${formatDecimal(l.trip.distance_km)} km` : "trajeto"} ·{" "}
                      {l.trip.harsh_brake_count} freada(s) brusca(s) · ver mapa
                    </Link>
                  )}
                  {checks.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {checks.map((c) => (
                        <span
                          key={c.id}
                          className={`rounded-full border px-1.5 py-px text-[10px] ${
                            c.mark === "ok"
                              ? "border-success/30 text-success"
                              : c.mark === "atencao"
                                ? "border-warning/30 text-warning"
                                : "border-destructive/30 text-destructive"
                          }`}
                        >
                          {CHECKLIST_ITEMS.find((i) => i.id === c.id)?.label ?? c.id}: {CHECKLIST_MARK_LABEL[c.mark]}
                        </span>
                      ))}
                    </div>
                  )}
                  {l.notes && <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">“{l.notes}”</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
