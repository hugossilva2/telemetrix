import { describe, expect, it } from "vitest";
import { fuelMetrics, type FuelLogPoint } from "./metrics";

const log = (date: string, mileage: number, liters: number, cost: number): FuelLogPoint => ({
  date,
  mileage_at_fill: mileage,
  liters_filled: liters,
  total_cost: cost,
  price_per_liter: cost / liters,
});

describe("fuelMetrics", () => {
  it("returns empty metrics with a single fill", () => {
    const m = fuelMetrics([log("2026-08-01T10:00:00Z", 1000, 30, 180)]);
    expect(m.points).toHaveLength(0);
    expect(m.avgKmpl).toBeNull();
    expect(m.avgCostPerKm).toBeNull();
  });

  it("computes km/L and R$/km between fills", () => {
    const m = fuelMetrics([
      log("2026-08-01T10:00:00Z", 1000, 30, 180),
      log("2026-08-10T10:00:00Z", 1300, 30, 180),
    ]);
    expect(m.points).toHaveLength(1);
    expect(m.lastKmpl).toBeCloseTo(10, 2);
    expect(m.lastCostPerKm).toBeCloseTo(0.6, 3);
    expect(m.avgKmpl).toBeCloseTo(10, 2);
  });

  it("ignores non-progressing odometer and unsorted input", () => {
    const m = fuelMetrics([
      log("2026-08-10T10:00:00Z", 1300, 30, 180),
      log("2026-08-01T10:00:00Z", 1000, 30, 180),
      log("2026-08-15T10:00:00Z", 1300, 20, 120),
    ]);
    expect(m.points).toHaveLength(1);
    expect(m.points[0].distanceKm).toBe(300);
  });

  it("weights averages by distance", () => {
    const m = fuelMetrics([
      log("2026-08-01T10:00:00Z", 0, 10, 60),
      log("2026-08-02T10:00:00Z", 100, 10, 60),
      log("2026-08-03T10:00:00Z", 400, 30, 180),
    ]);
    expect(m.avgKmpl).toBeCloseTo(10, 2);
    expect(m.avgCostPerKm).toBeCloseTo(0.6, 3);
  });
});
