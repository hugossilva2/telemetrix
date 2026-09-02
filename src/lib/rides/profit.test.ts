import { describe, expect, it } from "vitest";
import {
  dailyEarnings,
  dayPeriod,
  profitSummary,
  shiftHours,
  shiftKm,
  weekPeriod,
} from "./profit";

const P = { start: new Date("2026-09-01T00:00:00"), end: new Date("2026-09-08T00:00:00") };

describe("profitSummary", () => {
  it("soma ganhos, subtrai combustível e despesas", () => {
    const s = profitSummary(
      {
        rides: [
          { occurred_at: "2026-09-02T10:00:00", platform: "uber", amount: 30, tip: 5, distance_km: 10, duration_min: 20 },
          { occurred_at: "2026-09-03T10:00:00", platform: "99", amount: 20, tip: 0, distance_km: 5, duration_min: 10 },
          { occurred_at: "2026-08-30T10:00:00", platform: "uber", amount: 999, tip: 0, distance_km: 1, duration_min: 1 },
        ],
        shifts: [],
        fuel: [{ date: "2026-09-02T12:00:00", amount: 15 }],
        expenses: [{ date: "2026-09-04", amount: 5 }],
      },
      P,
    );
    expect(s.rides).toBe(2);
    expect(s.earnings).toBe(55);
    expect(s.tips).toBe(5);
    expect(s.fuelCost).toBe(15);
    expect(s.otherCost).toBe(5);
    expect(s.profit).toBe(35);
    expect(s.km).toBe(15);
    expect(s.hours).toBe(0.5);
    expect(s.profitPerKm).toBeCloseTo(2.33, 2);
    expect(s.profitPerHour).toBe(70);
    expect(s.byPlatform[0]).toEqual({ platform: "uber", earnings: 35, rides: 1 });
  });

  it("usa horas e km dos turnos quando existem", () => {
    const s = profitSummary(
      {
        rides: [{ occurred_at: "2026-09-02T10:00:00", platform: "uber", amount: 100, tip: 0, distance_km: 20, duration_min: 30 }],
        shifts: [
          { started_at: "2026-09-02T08:00:00", ended_at: "2026-09-02T12:00:00", start_mileage: 1000, end_mileage: 1050 },
        ],
        fuel: [],
        expenses: [],
      },
      P,
    );
    expect(s.hours).toBe(4);
    expect(s.km).toBe(50);
    expect(s.profitPerHour).toBe(25);
    expect(s.profitPerKm).toBe(2);
  });

  it("retorna nulos sem km/horas", () => {
    const s = profitSummary({ rides: [], shifts: [], fuel: [], expenses: [] }, P);
    expect(s.profitPerKm).toBeNull();
    expect(s.profitPerHour).toBeNull();
    expect(s.earningsPerRide).toBeNull();
  });
});

describe("shiftHours / shiftKm", () => {
  it("turno aberto conta até agora e recorta no período", () => {
    const now = new Date("2026-09-02T10:00:00");
    const h = shiftHours([{ started_at: "2026-08-31T22:00:00", ended_at: null, start_mileage: null, end_mileage: null }], P, now);
    expect(h).toBe(34);
  });
  it("ignora odômetro inválido", () => {
    expect(shiftKm([{ started_at: "2026-09-02T08:00:00", ended_at: "2026-09-02T09:00:00", start_mileage: 100, end_mileage: 90 }], P)).toBe(0);
  });
});

describe("períodos", () => {
  it("semana começa na segunda", () => {
    const w = weekPeriod(new Date("2026-09-02T15:00:00")); // quarta
    expect(w.start.getDay()).toBe(1);
    expect(w.start.getDate()).toBe(31);
    expect(w.end.getDate()).toBe(7);
  });
  it("dia tem 24h", () => {
    const d = dayPeriod(new Date("2026-09-02T15:00:00"));
    expect(d.end.getTime() - d.start.getTime()).toBe(86_400_000);
  });
  it("dailyEarnings gera seg–dom", () => {
    const days = dailyEarnings(
      [{ occurred_at: "2026-09-02T10:00:00", platform: "uber", amount: 10, tip: 0, distance_km: null, duration_min: null }],
      weekPeriod(new Date("2026-09-02T15:00:00")),
    );
    expect(days.map((d) => d.label)).toEqual(["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]);
    expect(days[2].value).toBe(10);
  });
});

describe("weeklyBreakdown / kmPerWeek", () => {
  it("quebra a semana em 7 dias seg–dom", async () => {
    const { weeklyBreakdown, weekPeriodFromKey } = await import("./profit");
    const p = weekPeriodFromKey("2026-08-31");
    const days = weeklyBreakdown(
      [
        { occurred_at: "2026-08-31T10:00:00", platform: "uber", amount: 30, tip: 0, distance_km: 10, duration_min: 30 },
        { occurred_at: "2026-09-06T10:00:00", platform: "99", amount: 20, tip: 5, distance_km: 5, duration_min: 30 },
      ],
      [],
      p,
    );
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ label: "seg", date: "2026-08-31", rides: 1, earnings: 30, km: 10, hours: 0.5 });
    expect(days[6]).toMatchObject({ label: "dom", date: "2026-09-06", rides: 1, earnings: 25 });
    expect(days[3].rides).toBe(0);
  });

  it("estima km por semana ignorando semanas vazias", async () => {
    const { kmPerWeek } = await import("./profit");
    const now = new Date("2026-09-02T12:00:00");
    const km = kmPerWeek(
      [
        { occurred_at: "2026-09-01T10:00:00", platform: "uber", amount: 1, tip: 0, distance_km: 100, duration_min: 1 },
        { occurred_at: "2026-08-20T10:00:00", platform: "uber", amount: 1, tip: 0, distance_km: 300, duration_min: 1 },
      ],
      [],
      4,
      now,
    );
    expect(km).toBe(200);
    expect(kmPerWeek([], [], 4, now)).toBeNull();
  });
});
