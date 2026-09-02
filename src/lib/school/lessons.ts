/**
 * Regras puras de aulas e alunos (instrutor autônomo / autoescola).
 */

export type LessonStatus = "agendada" | "em_andamento" | "concluida" | "cancelada";

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const LESSON_STATUS_CLASSES: Record<LessonStatus, string> = {
  agendada: "bg-sky-500/10 text-sky-400 border-sky-500/25",
  em_andamento: "bg-primary/15 text-primary border-primary/30",
  concluida: "bg-success/10 text-success border-success/25",
  cancelada: "bg-muted text-muted-foreground border-border",
};

/** Categorias de habilitação mais comuns. */
export const LICENSE_CATEGORIES = ["A", "B", "AB", "C", "D", "E"] as const;

/** Itens avaliados na aula prática. */
export const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "embreagem", label: "Embreagem e arranque" },
  { id: "cambio", label: "Trocas de marcha" },
  { id: "baliza", label: "Baliza" },
  { id: "rampa", label: "Parada em rampa" },
  { id: "sinalizacao", label: "Sinalização e setas" },
  { id: "retrovisores", label: "Uso dos retrovisores" },
  { id: "velocidade", label: "Controle de velocidade" },
  { id: "distancia", label: "Distância de segurança" },
  { id: "conversoes", label: "Conversões e cruzamentos" },
  { id: "estacionamento", label: "Estacionamento" },
];

export type ChecklistMark = "ok" | "atencao" | "nao";

export interface ChecklistEntry {
  id: string;
  mark: ChecklistMark;
}

export const CHECKLIST_MARK_LABEL: Record<ChecklistMark, string> = {
  ok: "Bem",
  atencao: "Atenção",
  nao: "Precisa treinar",
};

export function parseChecklist(raw: unknown): ChecklistEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ChecklistEntry[] = [];
  for (const it of raw) {
    if (
      it &&
      typeof it === "object" &&
      typeof (it as ChecklistEntry).id === "string" &&
      ["ok", "atencao", "nao"].includes((it as ChecklistEntry).mark)
    ) {
      out.push({ id: (it as ChecklistEntry).id, mark: (it as ChecklistEntry).mark });
    }
  }
  return out;
}

export interface LessonLike {
  status: LessonStatus;
  scheduled_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  price: number | null;
  paid: boolean;
  checklist?: unknown;
  trip_eco_score?: number | null;
}

export interface StudentProgress {
  done: number;
  scheduled: number;
  contracted: number;
  remaining: number;
  /** 0–100 */
  pct: number;
  /** Média do Eco Score das aulas com viagem vinculada. */
  avgEco: number | null;
  /** Itens do checklist que mais aparecem como "precisa treinar" / "atenção". */
  weakSpots: { id: string; count: number }[];
  nextLessonAt: string | null;
  lastLessonAt: string | null;
}

export function studentProgress(
  lessons: LessonLike[],
  contracted: number,
  now = new Date(),
): StudentProgress {
  const done = lessons.filter((l) => l.status === "concluida").length;
  const scheduled = lessons.filter((l) => l.status === "agendada").length;
  const remaining = Math.max(0, contracted - done);
  const pct = contracted > 0 ? Math.min(100, Math.round((done / contracted) * 100)) : 0;

  const ecos = lessons
    .filter((l) => l.status === "concluida" && typeof l.trip_eco_score === "number")
    .map((l) => l.trip_eco_score as number);
  const avgEco = ecos.length ? Math.round(ecos.reduce((a, b) => a + b, 0) / ecos.length) : null;

  const weak = new Map<string, number>();
  for (const l of lessons) {
    for (const c of parseChecklist(l.checklist)) {
      if (c.mark === "ok") continue;
      weak.set(c.id, (weak.get(c.id) ?? 0) + (c.mark === "nao" ? 2 : 1));
    }
  }
  const weakSpots = [...weak.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const upcoming = lessons
    .filter((l) => l.status === "agendada" && new Date(l.scheduled_at) >= now)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = lessons
    .filter((l) => l.status === "concluida")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return {
    done,
    scheduled,
    contracted,
    remaining,
    pct,
    avgEco,
    weakSpots,
    nextLessonAt: upcoming[0]?.scheduled_at ?? null,
    lastLessonAt: past[0]?.scheduled_at ?? null,
  };
}

export interface LessonFinancials {
  billed: number;
  received: number;
  pending: number;
  pendingCount: number;
}

/** Financeiro: aulas concluídas com valor; pago x pendente. */
export function lessonFinancials(lessons: LessonLike[]): LessonFinancials {
  let billed = 0;
  let received = 0;
  let pendingCount = 0;
  for (const l of lessons) {
    if (l.status !== "concluida" || l.price == null) continue;
    const v = Number(l.price) || 0;
    billed += v;
    if (l.paid) received += v;
    else pendingCount += 1;
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { billed: r2(billed), received: r2(received), pending: r2(billed - received), pendingCount };
}

export interface TripCandidate {
  id: string;
  start_time: string;
  end_time: string | null;
}

/**
 * Escolhe a viagem gravada que corresponde à aula: começou até 15 min antes
 * do início da aula e depois do início − 15 min; prefere a mais longa dentro
 * da janela [início, fim].
 */
export function matchTripForLesson(
  trips: TripCandidate[],
  startedAt: string,
  endedAt: string,
  toleranceMs = 15 * 60_000,
): TripCandidate | null {
  const s = new Date(startedAt).getTime() - toleranceMs;
  const e = new Date(endedAt).getTime() + toleranceMs;
  let best: TripCandidate | null = null;
  let bestDur = -1;
  for (const t of trips) {
    const ts = new Date(t.start_time).getTime();
    const te = t.end_time ? new Date(t.end_time).getTime() : ts;
    if (ts < s || ts > e) continue;
    const dur = Math.min(te, e) - Math.max(ts, s);
    if (dur > bestDur) {
      bestDur = dur;
      best = t;
    }
  }
  return best;
}

/** Aulas do dia (agendadas ou em andamento) ordenadas por horário. */
export function lessonsOfDay<T extends LessonLike>(lessons: T[], day = new Date()): T[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return lessons
    .filter((l) => {
      const t = new Date(l.scheduled_at).getTime();
      return t >= start.getTime() && t < end.getTime() && l.status !== "cancelada";
    })
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}
