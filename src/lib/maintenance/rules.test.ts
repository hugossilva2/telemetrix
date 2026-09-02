import { describe, expect, it } from "vitest";
import { computeStatus, daysUntilAtPace, defaultIntervalKm, HEAVY_WARN_KM } from "./rules";

const rec = {
  id: "1", type: "oleo" as const, title: null, service_date: "2026-08-01",
  mileage_at_service: 50000, interval_km: 5000, interval_months: null,
  cost: null, workshop: null, notes: null, file_path: null,
};

describe("manutenção por rodagem alta", () => {
  it("usa intervalos menores para uso intenso", () => {
    expect(defaultIntervalKm("oleo", false)).toBe(10000);
    expect(defaultIntervalKm("oleo", true)).toBe(5000);
    expect(defaultIntervalKm("outro", true)).toBeNull();
  });

  it("avisa com 1.000 km de antecedência no modo app", () => {
    expect(computeStatus(rec, 54200).status).toBe("ok");
    expect(computeStatus(rec, 54200, { warnKm: HEAVY_WARN_KM }).status).toBe("soon");
    expect(computeStatus(rec, 55100, { warnKm: HEAVY_WARN_KM }).status).toBe("overdue");
  });

  it("estima dias até vencer pelo ritmo semanal", () => {
    expect(daysUntilAtPace(1000, 1000)).toBe(7);
    expect(daysUntilAtPace(500, 1000)).toBe(4);
    expect(daysUntilAtPace(-10, 1000)).toBe(0);
    expect(daysUntilAtPace(500, null)).toBeNull();
  });
});
