import { describe, expect, it } from "vitest";
import {
  lessonFinancials,
  lessonsOfDay,
  matchTripForLesson,
  parseChecklist,
  studentProgress,
  type LessonLike,
} from "./lessons";

const L = (p: Partial<LessonLike> & { scheduled_at: string }): LessonLike => ({
  status: "concluida",
  price: null,
  paid: false,
  ...p,
});

describe("parseChecklist", () => {
  it("aceita apenas entradas válidas", () => {
    expect(parseChecklist([{ id: "baliza", mark: "ok" }, { id: "x", mark: "zzz" }, null, 1])).toEqual([
      { id: "baliza", mark: "ok" },
    ]);
    expect(parseChecklist("nope")).toEqual([]);
  });
});

describe("studentProgress", () => {
  const now = new Date("2026-08-30T12:00:00Z");
  const lessons: LessonLike[] = [
    L({ scheduled_at: "2026-08-20T10:00:00Z", trip_eco_score: 80, checklist: [{ id: "baliza", mark: "nao" }] }),
    L({ scheduled_at: "2026-08-22T10:00:00Z", trip_eco_score: 90, checklist: [{ id: "baliza", mark: "atencao" }, { id: "embreagem", mark: "atencao" }] }),
    L({ scheduled_at: "2026-09-01T10:00:00Z", status: "agendada" }),
    L({ scheduled_at: "2026-08-25T10:00:00Z", status: "cancelada" }),
  ];
  it("conta aulas, percentual e média de eco", () => {
    const p = studentProgress(lessons, 10, now);
    expect(p.done).toBe(2);
    expect(p.scheduled).toBe(1);
    expect(p.remaining).toBe(8);
    expect(p.pct).toBe(20);
    expect(p.avgEco).toBe(85);
    expect(p.nextLessonAt).toBe("2026-09-01T10:00:00Z");
    expect(p.lastLessonAt).toBe("2026-08-22T10:00:00Z");
  });
  it("pondera pontos fracos ('nao' vale 2)", () => {
    const p = studentProgress(lessons, 0, now);
    expect(p.weakSpots[0]).toEqual({ id: "baliza", count: 3 });
    expect(p.weakSpots[1]).toEqual({ id: "embreagem", count: 1 });
    expect(p.pct).toBe(0);
  });
});

describe("lessonFinancials", () => {
  it("separa recebido e pendente só das concluídas", () => {
    const f = lessonFinancials([
      L({ scheduled_at: "a", price: 100.5, paid: true }),
      L({ scheduled_at: "b", price: 99.5, paid: false }),
      L({ scheduled_at: "c", price: 50, paid: false, status: "agendada" }),
    ]);
    expect(f).toEqual({ billed: 200, received: 100.5, pending: 99.5, pendingCount: 1 });
  });
});

describe("matchTripForLesson", () => {
  const trips = [
    { id: "early", start_time: "2026-08-30T08:00:00Z", end_time: "2026-08-30T08:40:00Z" },
    { id: "short", start_time: "2026-08-30T10:05:00Z", end_time: "2026-08-30T10:15:00Z" },
    { id: "long", start_time: "2026-08-30T10:10:00Z", end_time: "2026-08-30T10:50:00Z" },
  ];
  it("prefere a viagem mais longa dentro da janela", () => {
    expect(matchTripForLesson(trips, "2026-08-30T10:00:00Z", "2026-08-30T11:00:00Z")?.id).toBe("long");
  });
  it("ignora viagens fora da tolerância", () => {
    expect(matchTripForLesson(trips.slice(0, 1), "2026-08-30T10:00:00Z", "2026-08-30T11:00:00Z")).toBeNull();
  });
  it("aceita viagem iniciada até 15 min antes", () => {
    const t = [{ id: "pre", start_time: "2026-08-30T09:50:00Z", end_time: "2026-08-30T10:30:00Z" }];
    expect(matchTripForLesson(t, "2026-08-30T10:00:00Z", "2026-08-30T11:00:00Z")?.id).toBe("pre");
  });
});

describe("lessonsOfDay", () => {
  it("filtra pelo dia local, exclui canceladas e ordena", () => {
    const day = new Date(2026, 7, 30, 15);
    const mk = (h: number, status: LessonLike["status"] = "agendada") =>
      L({ scheduled_at: new Date(2026, 7, 30, h).toISOString(), status });
    const res = lessonsOfDay([mk(14), mk(9), mk(11, "cancelada"), L({ scheduled_at: new Date(2026, 7, 31, 9).toISOString(), status: "agendada" })], day);
    expect(res.map((l) => new Date(l.scheduled_at).getHours())).toEqual([9, 14]);
  });
});
