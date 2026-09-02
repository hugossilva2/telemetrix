import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Play, Plus, Square } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import { formatBRL } from "@/lib/format";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { invalidateSchool, useLessons, useMySchool, useStudents, type LessonRecord } from "@/lib/school/api";
import { lessonFinancials, lessonsOfDay } from "@/lib/school/lessons";
import { LessonListItem } from "@/components/school/LessonListItem";
import { SchoolSetupCard } from "@/components/school/SchoolSetupCard";
import { useEndLesson, useStartLesson } from "@/lib/school/actions";
import { memberName, useFleet, useAssignments, useTeam } from "@/lib/school/teamApi";
import { conflictsForNew } from "@/lib/school/team";

export const Route = createFileRoute("/_authenticated/aulas")({
  validateSearch: (s: Record<string, unknown>): { aluno?: string } => ({
    aluno: typeof s.aluno === "string" ? s.aluno : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Aulas · Telemetrix" },
      { name: "description", content: "Agenda de aulas práticas: agende, inicie e encerre; a viagem gravada vira o trajeto avaliado." },
      { property: "og:title", content: "Aulas · Telemetrix" },
      { property: "og:description", content: "Agenda de aulas do instrutor." },
    ],
  }),
  component: AulasPage,
});

const PRICE_KEY = "telemetrix.lastLessonPrice";

function defaultWhen() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function AulasPage() {
  const { aluno } = Route.useSearch();
  const qc = useQueryClient();
  const { vehicleId } = useActiveVehicle();
  const { school, isLoading: schoolLoading } = useMySchool();
  const students = useStudents(school?.id);
  const lessons = useLessons(school?.id);
  const startLesson = useStartLesson();
  const endLesson = useEndLesson();
  const isSchool = school?.kind === "autoescola";
  const isOwner = school?.role === "owner";
  const team = useTeam(isSchool ? school?.id : null);
  const fleet = useFleet(school?.id);
  const assignments = useAssignments(isSchool ? school?.id : null);
  const [meId, setMeId] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? ""));
  }, []);
  const [instructorId, setInstructorId] = useState<string>("");
  const effectiveInstructor = instructorId || meId;
  const [lessonVehicleId, setLessonVehicleId] = useState<string>("");
  const [onlyMine, setOnlyMine] = useState(true);

  const [open, setOpen] = useState(!!aluno);
  const [studentId, setStudentId] = useState(aluno ?? "");
  const [when, setWhen] = useState(defaultWhen);
  const [duration, setDuration] = useState("50");
  const [price, setPrice] = useState(() => {
    try {
      return localStorage.getItem(PRICE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [tab, setTab] = useState<"proximas" | "historico">("proximas");

  const allSchool = lessons.data ?? [];
  // Instrutor de autoescola vê por padrão só as próprias aulas; o dono vê tudo.
  const all = isSchool && !isOwner && onlyMine && meId ? allSchool.filter((l) => l.instructor_id === meId) : allSchool;
  const today = useMemo(() => lessonsOfDay(all), [all]);

  const fleetCars = fleet.data?.fleet ?? [];
  const allowedCars =
    isSchool && !isOwner && (assignments.data ?? []).some((a) => a.user_id === meId)
      ? fleetCars.filter((v) => (assignments.data ?? []).some((a) => a.user_id === meId && a.vehicle_id === v.id))
      : fleetCars;
  const chosenVehicle = lessonVehicleId || (allowedCars.length > 0 ? allowedCars[0].id : vehicleId);
  const draftConflicts = useMemo(() => {
    if (!open || !effectiveInstructor || !when) return [];
    return conflictsForNew(
      allSchool.map((l) => ({ ...l, trip_eco_score: l.trip?.eco_score ?? null })),
      {
        scheduled_at: new Date(when).toISOString(),
        duration_min: Math.max(10, parseInt(duration || "50", 10) || 50),
        instructor_id: effectiveInstructor,
        vehicle_id: chosenVehicle ?? null,
      },
    );
  }, [open, effectiveInstructor, when, duration, chosenVehicle, allSchool]);
  const inProgress = all.find((l) => l.status === "em_andamento") ?? null;
  const now = Date.now();
  const upcoming = all
    .filter((l) => l.status === "agendada" && new Date(l.scheduled_at).getTime() >= now - 3 * 3_600_000)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const history = all.filter((l) => !upcoming.includes(l) && l.status !== "em_andamento");
  const monthFin = useMemo(() => {
    const m = new Date();
    return lessonFinancials(
      all.filter((l) => {
        const d = new Date(l.scheduled_at);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      }),
    );
  }, [all]);

  const create = useMutation({
    mutationFn: async () => {
      if (!school) throw new Error("Escola não encontrada");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      if (!studentId) throw new Error("Escolha o aluno.");
      const p = price ? parseFloat(price.replace(",", ".")) : null;
      const { error } = await supabase.from("lessons").insert({
        org_id: school.id,
        student_id: studentId,
        instructor_id: isOwner && instructorId ? instructorId : uid,
        vehicle_id: chosenVehicle ?? null,
        scheduled_at: new Date(when).toISOString(),
        duration_min: Math.max(10, parseInt(duration || "50", 10) || 50),
        price: p != null && Number.isFinite(p) ? p : null,
      });
      if (error) throw error;
      try {
        localStorage.setItem(PRICE_KEY, price);
      } catch {
        /* sem storage */
      }
    },
    onSuccess: () => {
      toast.success("Aula agendada!");
      setOpen(false);
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível agendar a aula.")),
  });

  if (!schoolLoading && !school) {
    return (
      <AppShell title="Aulas" subtitle="Cadastre sua escola para começar">
        <SchoolSetupCard />
      </AppShell>
    );
  }

  const activeStudents = (students.data ?? []).filter((s) => s.active);

  return (
    <AppShell title="Aulas" subtitle={`${today.length} hoje · ${upcoming.length} agendada${upcoming.length === 1 ? "" : "s"}`}>
      {inProgress && <InProgressCard lesson={inProgress} onEnd={() => endLesson.mutate(inProgress)} ending={endLesson.isPending} />}

      {!inProgress && today.length > 0 && (
        <section className="card-surface border-primary/30 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" /> Hoje
          </h2>
          <ul className="mt-2 space-y-2">
            {today.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.student?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(l.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {l.duration_min} min
                    {l.status === "concluida" && " · concluída"}
                  </p>
                </div>
                {l.status === "agendada" ? (
                  <Button size="sm" className="h-9" disabled={startLesson.isPending} onClick={() => startLesson.mutate(l)}>
                    <Play className="size-4" /> Iniciar
                  </Button>
                ) : (
                  <Link to="/aulas/$id" params={{ id: l.id }} className="text-xs font-semibold text-primary">
                    Ver
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isSchool && !isOwner && (
        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrar só as minhas aulas</span>
          <input type="checkbox" className="size-4 accent-primary" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        </label>
      )}

      <div className="flex gap-2">
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
          {(["proximas", "historico"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 rounded-lg text-sm font-semibold ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {t === "proximas" ? "Próximas" : "Histórico"}
            </button>
          ))}
        </div>
        <Button type="button" className="h-11 shrink-0" onClick={() => setOpen((v) => !v)} disabled={activeStudents.length === 0}>
          <Plus className="size-4" /> Agendar
        </Button>
      </div>

      {activeStudents.length === 0 && !students.isLoading && (
        <p className="text-center text-xs text-muted-foreground">
          Cadastre um aluno primeiro em{" "}
          <Link to="/alunos" className="font-semibold text-primary">
            Alunos
          </Link>
          .
        </p>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="card-surface space-y-3 p-4"
        >
          <h2 className="text-sm font-semibold">Agendar aula</h2>
          <div className="space-y-1.5">
            <Label htmlFor="ls-student">Aluno</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="ls-student" className="h-11">
                <SelectValue placeholder="Escolha o aluno" />
              </SelectTrigger>
              <SelectContent>
                {activeStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSchool && isOwner && (team.data?.length ?? 0) > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="ls-instr">Instrutor</Label>
              <Select value={effectiveInstructor} onValueChange={setInstructorId}>
                <SelectTrigger id="ls-instr" className="h-11">
                  <SelectValue placeholder="Instrutor" />
                </SelectTrigger>
                <SelectContent>
                  {(team.data ?? []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                      {m.user_id === meId ? " (eu)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {allowedCars.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="ls-car">Carro</Label>
              <Select value={chosenVehicle ?? ""} onValueChange={setLessonVehicleId}>
                <SelectTrigger id="ls-car" className="h-11">
                  <SelectValue placeholder="Carro" />
                </SelectTrigger>
                <SelectContent>
                  {allowedCars.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} · {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ls-when">Data e hora</Label>
            <Input id="ls-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-11" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ls-dur">Duração (min)</Label>
              <Input id="ls-dur" type="number" inputMode="numeric" min="10" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ls-price">Valor (R$)</Label>
              <Input id="ls-price" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
            </div>
          </div>
          {draftConflicts.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              Conflito de horário: {draftConflicts[0].kind === "instrutor" ? "este instrutor" : "este carro"} já tem aula nesse período.
              Você ainda pode agendar.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={create.isPending}>
              {create.isPending ? "Salvando…" : "Agendar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <section className="card-surface p-0">
        {lessons.isLoading ? (
          <p className="p-4 text-xs text-muted-foreground">Carregando aulas…</p>
        ) : (tab === "proximas" ? upcoming : history).length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            {tab === "proximas" ? "Nenhuma aula agendada." : "Sem aulas anteriores nos últimos 90 dias."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(tab === "proximas" ? upcoming : history).map((l) => (
              <LessonListItem
                key={l.id}
                lesson={l}
                instructorName={isSchool && (isOwner || !onlyMine) ? memberName(team.data, l.instructor_id) : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Financeiro do mês</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Faturado</p>
            <p className="font-mono text-sm font-semibold">{formatBRL(monthFin.billed)}</p>
          </div>
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Recebido</p>
            <p className="font-mono text-sm font-semibold text-success">{formatBRL(monthFin.received)}</p>
          </div>
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Pendente</p>
            <p className={`font-mono text-sm font-semibold ${monthFin.pending > 0 ? "text-warning" : ""}`}>
              {formatBRL(monthFin.pending)}
            </p>
            {monthFin.pendingCount > 0 && <p className="text-[10px] text-muted-foreground">{monthFin.pendingCount} aula(s)</p>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function InProgressCard({ lesson, onEnd, ending }: { lesson: LessonRecord; onEnd: () => void; ending: boolean }) {
  const startedMs = lesson.started_at ? new Date(lesson.started_at).getTime() : Date.now();
  const elapsed = Math.max(0, Math.round((Date.now() - startedMs) / 60000));
  return (
    <section className="card-surface border-primary/40 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <span className="relative grid size-11 place-items-center rounded-full bg-primary/15 text-primary">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <Play className="relative size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Aula em andamento</p>
          <p className="truncate text-sm font-semibold">{lesson.student?.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {elapsed} min · previsto {lesson.duration_min} min
          </p>
        </div>
        <Button type="button" variant="destructive" className="h-10" onClick={onEnd} disabled={ending}>
          <Square className="size-4" /> Encerrar
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A viagem gravada pelo OBD/rastreador será vinculada automaticamente ao encerrar.
      </p>
    </section>
  );
}
