import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Car, ChevronLeft, ChevronRight, Fuel, GraduationCap, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { formatBRL, formatDecimal } from "@/lib/format";
import { useLessons, useMySchool, type LessonRecord } from "@/lib/school/api";
import { memberName, useFleet, useFleetTrips, useTeam } from "@/lib/school/teamApi";
import { findLessonConflicts, fleetStats, instructorStats, type TeamLesson } from "@/lib/school/team";
import { lessonFinancials } from "@/lib/school/lessons";

export const Route = createFileRoute("/_authenticated/escola")({
  head: () => ({
    meta: [
      { title: "Visão da escola · Telemetrix" },
      { name: "description", content: "Aulas por instrutor, km e combustível por carro, custo por aula e ranking de instrutores." },
      { property: "og:title", content: "Visão da escola · Telemetrix" },
      { property: "og:description", content: "Painel do dono da autoescola." },
    ],
  }),
  component: EscolaPage,
});

function toTeam(l: LessonRecord): TeamLesson {
  return { ...l, trip_eco_score: l.trip?.eco_score ?? null };
}

function EscolaPage() {
  const { school } = useMySchool();
  const team = useTeam(school?.id);
  const fleet = useFleet(school?.id);
  const lessons = useLessons(school?.id);

  const [offset, setOffset] = useState(0);
  const { from, to, label } = useMemo(() => {
    const d = new Date();
    const f = new Date(d.getFullYear(), d.getMonth() + offset, 1);
    const t = new Date(d.getFullYear(), d.getMonth() + offset + 1, 1);
    return { from: f, to: t, label: f.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
  }, [offset]);

  const fleetIds = (fleet.data?.fleet ?? []).map((v) => v.id);
  const trips = useFleetTrips(fleetIds, from, to);

  const monthLessons = useMemo(
    () =>
      (lessons.data ?? [])
        .filter((l) => {
          const t = new Date(l.scheduled_at).getTime();
          return t >= from.getTime() && t < to.getTime();
        })
        .map(toTeam),
    [lessons.data, from, to],
  );
  const stats = useMemo(() => instructorStats(monthLessons), [monthLessons]);
  const fleetRows = useMemo(() => fleetStats(fleetIds, trips.data ?? [], monthLessons), [fleetIds, trips.data, monthLessons]);
  const fin = useMemo(() => lessonFinancials(monthLessons), [monthLessons]);
  const conflicts = useMemo(() => findLessonConflicts((lessons.data ?? []).map(toTeam)), [lessons.data]);
  const totalFuel = fleetRows.reduce((s, r) => s + r.fuelCost, 0);
  const totalKm = fleetRows.reduce((s, r) => s + r.km, 0);
  const done = monthLessons.filter((l) => l.status === "concluida").length;
  const byId = (id: string) => lessons.data?.find((l) => l.id === id);

  return (
    <AppShell title="Visão da escola" subtitle={school?.name}>
      <div className="flex items-center justify-between rounded-xl bg-muted/60 p-1">
        <button type="button" aria-label="Mês anterior" className="grid size-9 place-items-center rounded-lg" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{label}</span>
        <button
          type="button"
          aria-label="Próximo mês"
          className="grid size-9 place-items-center rounded-lg disabled:opacity-30"
          disabled={offset >= 0}
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <section className="grid grid-cols-2 gap-2">
        <div className="card-surface p-3">
          <p className="text-[10px] text-muted-foreground">Aulas concluídas</p>
          <p className="font-mono text-2xl font-bold">{done}</p>
        </div>
        <div className="card-surface p-3">
          <p className="text-[10px] text-muted-foreground">Faturado</p>
          <p className="font-mono text-2xl font-bold">{formatBRL(fin.billed)}</p>
          {fin.pending > 0 && <p className="text-[10px] text-warning">{formatBRL(fin.pending)} pendente</p>}
        </div>
        <div className="card-surface p-3">
          <p className="text-[10px] text-muted-foreground">Km da frota</p>
          <p className="font-mono text-2xl font-bold">{formatDecimal(totalKm)}</p>
        </div>
        <div className="card-surface p-3">
          <p className="text-[10px] text-muted-foreground">Combustível / aula</p>
          <p className="font-mono text-2xl font-bold">{done ? formatBRL(totalFuel / done) : "—"}</p>
          <p className="text-[10px] text-muted-foreground">{formatBRL(totalFuel)} no mês</p>
        </div>
      </section>

      {conflicts.length > 0 && (
        <section className="card-surface border-warning/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="size-4" /> Conflitos de agenda
          </h2>
          <ul className="mt-2 space-y-1.5">
            {conflicts.slice(0, 6).map((c) => {
              const a = byId(c.a);
              const b = byId(c.b);
              if (!a || !b) return null;
              return (
                <li key={`${c.a}-${c.b}`} className="text-xs">
                  <Link to="/aulas/$id" params={{ id: c.a }} className="font-semibold text-primary">
                    {new Date(a.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Link>{" "}
                  {a.student?.name} × {b.student?.name} — mesmo {c.kind === "instrutor" ? "instrutor" : "carro"}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-primary" /> Ranking de instrutores
        </h2>
        {stats.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Sem aulas neste mês.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {stats.map((s, i) => (
              <li key={s.instructor_id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{memberName(team.data, s.instructor_id)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.done}/{s.lessons} aulas · {formatDecimal(s.hours)} h · {formatBRL(s.revenue)}
                    {s.avgEco != null && ` · eco ${s.avgEco}`}
                  </p>
                </div>
                <span className="font-mono text-lg font-bold text-primary">{s.score}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Car className="size-4 text-primary" /> Por carro
        </h2>
        {fleetIds.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhum carro na frota.{" "}
            <Link to="/equipe" className="font-semibold text-primary">
              Montar frota
            </Link>
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {fleetRows.map((r) => {
              const v = fleet.data?.fleet.find((x) => x.id === r.vehicle_id);
              return (
                <li key={r.vehicle_id} className="rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {v?.name} <span className="font-mono text-[11px] text-muted-foreground">{v?.plate}</span>
                    </p>
                    <span className="text-xs text-muted-foreground">{r.lessons} aula{r.lessons === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Km</p>
                      <p className="font-mono text-sm font-semibold">{formatDecimal(r.km)}</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Fuel className="size-3" /> Litros
                      </p>
                      <p className="font-mono text-sm font-semibold">{formatDecimal(r.liters)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">R$/aula</p>
                      <p className="font-mono text-sm font-semibold">{r.costPerLesson != null ? formatBRL(r.costPerLesson) : "—"}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link to="/alunos" className="card-surface flex items-center gap-2 p-4 text-sm font-semibold">
        <GraduationCap className="size-4 text-primary" /> Alunos da escola
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}
