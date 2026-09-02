import type { LessonLike } from "./lessons";

export interface TeamLesson extends LessonLike {
  id: string;
  instructor_id: string;
  vehicle_id: string | null;
  duration_min: number;
}

export interface LessonConflict {
  a: string;
  b: string;
  kind: "instrutor" | "veiculo";
}

function windowOf(l: { scheduled_at: string; duration_min: number }) {
  const s = new Date(l.scheduled_at).getTime();
  return [s, s + Math.max(10, l.duration_min) * 60_000] as const;
}

/**
 * Conflitos de agenda: duas aulas ativas (agendada/em andamento) que se
 * sobrepõem no tempo com o mesmo instrutor ou o mesmo carro.
 */
export function findLessonConflicts(lessons: TeamLesson[]): LessonConflict[] {
  const active = lessons
    .filter((l) => l.status === "agendada" || l.status === "em_andamento")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const out: LessonConflict[] = [];
  for (let i = 0; i < active.length; i++) {
    const [, ae] = windowOf(active[i]);
    for (let j = i + 1; j < active.length; j++) {
      const [bs] = windowOf(active[j]);
      if (bs >= ae) break;
      const A = active[i];
      const B = active[j];
      if (A.instructor_id === B.instructor_id) out.push({ a: A.id, b: B.id, kind: "instrutor" });
      else if (A.vehicle_id && A.vehicle_id === B.vehicle_id) out.push({ a: A.id, b: B.id, kind: "veiculo" });
    }
  }
  return out;
}

/** Conflitos de uma aula nova (ainda sem id) contra a agenda existente. */
export function conflictsForNew(
  lessons: TeamLesson[],
  draft: { scheduled_at: string; duration_min: number; instructor_id: string; vehicle_id: string | null },
): LessonConflict[] {
  return findLessonConflicts([
    ...lessons,
    { ...draft, id: "__draft__", status: "agendada", price: null, paid: false },
  ]).filter((c) => c.a === "__draft__" || c.b === "__draft__");
}

export interface InstructorStat {
  instructor_id: string;
  lessons: number;
  done: number;
  hours: number;
  revenue: number;
  avgEco: number | null;
  /** Nota 0–100: 70% Eco Score médio + 30% taxa de conclusão. */
  score: number;
}

export function instructorStats(lessons: TeamLesson[]): InstructorStat[] {
  const by = new Map<string, TeamLesson[]>();
  for (const l of lessons) {
    if (l.status === "cancelada") continue;
    const arr = by.get(l.instructor_id) ?? [];
    arr.push(l);
    by.set(l.instructor_id, arr);
  }
  const out: InstructorStat[] = [];
  for (const [instructor_id, ls] of by) {
    const done = ls.filter((l) => l.status === "concluida");
    const ecos = done.map((l) => l.trip_eco_score).filter((v): v is number => typeof v === "number");
    const avgEco = ecos.length ? Math.round(ecos.reduce((a, b) => a + b, 0) / ecos.length) : null;
    const hours = done.reduce((s, l) => s + l.duration_min, 0) / 60;
    const revenue = done.reduce((s, l) => s + (l.price ?? 0), 0);
    const completion = ls.length ? done.length / ls.length : 0;
    const score = Math.round((avgEco ?? 70) * 0.7 + completion * 100 * 0.3);
    out.push({
      instructor_id,
      lessons: ls.length,
      done: done.length,
      hours: Math.round(hours * 10) / 10,
      revenue: Math.round(revenue * 100) / 100,
      avgEco,
      score,
    });
  }
  return out.sort((a, b) => b.score - a.score || b.done - a.done);
}

export interface FleetTrip {
  vehicle_id: string | null;
  distance_km: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
}

export interface FleetStat {
  vehicle_id: string;
  km: number;
  liters: number;
  fuelCost: number;
  lessons: number;
  /** Custo de combustível por aula concluída. */
  costPerLesson: number | null;
  kmPerLesson: number | null;
}

export function fleetStats(vehicleIds: string[], trips: FleetTrip[], lessons: TeamLesson[]): FleetStat[] {
  return vehicleIds
    .map((vehicle_id) => {
      const t = trips.filter((x) => x.vehicle_id === vehicle_id);
      const km = t.reduce((s, x) => s + (x.distance_km ?? 0), 0);
      const liters = t.reduce((s, x) => s + (x.fuel_liters ?? 0), 0);
      const fuelCost = t.reduce((s, x) => s + (x.estimated_cost ?? 0), 0);
      const done = lessons.filter((l) => l.vehicle_id === vehicle_id && l.status === "concluida").length;
      return {
        vehicle_id,
        km: Math.round(km * 10) / 10,
        liters: Math.round(liters * 10) / 10,
        fuelCost: Math.round(fuelCost * 100) / 100,
        lessons: done,
        costPerLesson: done ? Math.round((fuelCost / done) * 100) / 100 : null,
        kmPerLesson: done ? Math.round((km / done) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.km - a.km);
}
