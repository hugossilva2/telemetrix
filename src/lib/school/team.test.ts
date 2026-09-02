import { describe, expect, it } from "vitest";
import { conflictsForNew, findLessonConflicts, fleetStats, instructorStats, type TeamLesson } from "./team";

const mk = (p: Partial<TeamLesson> & { id: string; scheduled_at: string }): TeamLesson => ({
  status: "agendada",
  instructor_id: "i1",
  vehicle_id: "v1",
  duration_min: 50,
  price: null,
  paid: false,
  ...p,
});

describe("findLessonConflicts", () => {
  it("detecta sobreposição do mesmo instrutor", () => {
    const c = findLessonConflicts([
      mk({ id: "a", scheduled_at: "2026-09-02T10:00:00Z" }),
      mk({ id: "b", scheduled_at: "2026-09-02T10:30:00Z", vehicle_id: "v2" }),
    ]);
    expect(c).toEqual([{ a: "a", b: "b", kind: "instrutor" }]);
  });
  it("detecta mesmo carro com instrutores diferentes", () => {
    const c = findLessonConflicts([
      mk({ id: "a", scheduled_at: "2026-09-02T10:00:00Z" }),
      mk({ id: "b", scheduled_at: "2026-09-02T10:40:00Z", instructor_id: "i2" }),
    ]);
    expect(c[0]?.kind).toBe("veiculo");
  });
  it("ignora aulas que não se sobrepõem, canceladas ou concluídas", () => {
    const c = findLessonConflicts([
      mk({ id: "a", scheduled_at: "2026-09-02T10:00:00Z" }),
      mk({ id: "b", scheduled_at: "2026-09-02T10:50:00Z" }),
      mk({ id: "c", scheduled_at: "2026-09-02T10:10:00Z", status: "cancelada" }),
      mk({ id: "d", scheduled_at: "2026-09-02T10:10:00Z", status: "concluida" }),
    ]);
    expect(c).toEqual([]);
  });
  it("conflictsForNew só devolve conflitos do rascunho", () => {
    const c = conflictsForNew(
      [mk({ id: "a", scheduled_at: "2026-09-02T10:00:00Z" }), mk({ id: "b", scheduled_at: "2026-09-02T10:20:00Z" })],
      { scheduled_at: "2026-09-02T10:30:00Z", duration_min: 50, instructor_id: "i9", vehicle_id: "v1" },
    );
    expect(c).toHaveLength(2);
    expect(c.every((x) => x.kind === "veiculo")).toBe(true);
  });
});

describe("instructorStats", () => {
  it("agrupa por instrutor e ordena por nota", () => {
    const s = instructorStats([
      mk({ id: "1", scheduled_at: "x", status: "concluida", trip_eco_score: 90, price: 100 }),
      mk({ id: "2", scheduled_at: "x", status: "concluida", trip_eco_score: 70, price: 100 }),
      mk({ id: "3", scheduled_at: "x", status: "agendada" }),
      mk({ id: "4", scheduled_at: "x", instructor_id: "i2", status: "concluida", trip_eco_score: 95, price: 120 }),
      mk({ id: "5", scheduled_at: "x", instructor_id: "i2", status: "cancelada" }),
    ]);
    expect(s[0].instructor_id).toBe("i2");
    expect(s[0]).toMatchObject({ lessons: 1, done: 1, revenue: 120, avgEco: 95, score: 97 });
    expect(s[1]).toMatchObject({ instructor_id: "i1", lessons: 3, done: 2, hours: 1.7, revenue: 200, avgEco: 80 });
    expect(s[1].score).toBe(Math.round(80 * 0.7 + (2 / 3) * 100 * 0.3));
  });
});

describe("fleetStats", () => {
  it("soma km/litros/custo por carro e divide por aula concluída", () => {
    const s = fleetStats(
      ["v1", "v2"],
      [
        { vehicle_id: "v1", distance_km: 12.5, fuel_liters: 1.2, estimated_cost: 7.5 },
        { vehicle_id: "v1", distance_km: 7.5, fuel_liters: 0.8, estimated_cost: 4.5 },
        { vehicle_id: "v2", distance_km: 3, fuel_liters: null, estimated_cost: null },
      ],
      [
        mk({ id: "a", scheduled_at: "x", status: "concluida" }),
        mk({ id: "b", scheduled_at: "x", status: "concluida" }),
        mk({ id: "c", scheduled_at: "x", status: "agendada" }),
      ],
    );
    expect(s[0]).toEqual({ vehicle_id: "v1", km: 20, liters: 2, fuelCost: 12, lessons: 2, costPerLesson: 6, kmPerLesson: 10 });
    expect(s[1]).toMatchObject({ vehicle_id: "v2", km: 3, lessons: 0, costPerLesson: null });
  });
});
