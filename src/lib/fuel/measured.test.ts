import { describe, expect, it } from "vitest";
import { measuredAvgKmpl, measuredSegments, weeklyMeasuredKmpl } from "@/lib/fuel/measured";

const log = (
  date: string,
  mileage: number,
  liters: number,
  extra: { is_full_tank?: boolean; fuel_type?: string } = {},
) => ({
  date,
  mileage_at_fill: mileage,
  liters_filled: liters,
  is_full_tank: extra.is_full_tank ?? true,
  fuel_type: extra.fuel_type ?? "gasolina",
});

describe("measuredSegments", () => {
  it("calcula km/L entre tanques cheios consecutivos", () => {
    const segs = measuredSegments(
      [log("2026-08-01", 10_000, 40), log("2026-08-10", 10_500, 40)],
      "gasolina",
    );
    expect(segs).toHaveLength(1);
    expect(segs[0].kmpl).toBeCloseTo(12.5, 2);
  });

  it("soma o abastecimento parcial do meio nos litros do trecho", () => {
    const segs = measuredSegments(
      [
        log("2026-08-01", 10_000, 40),
        log("2026-08-05", 10_200, 20, { is_full_tank: false }),
        log("2026-08-10", 10_500, 30),
      ],
      "gasolina",
    );
    expect(segs).toHaveLength(1);
    // 500 km com 50 L (20 parciais + 30 do tanque cheio) = 10 km/L, não 16,7.
    expect(segs[0].liters).toBeCloseTo(50, 3);
    expect(segs[0].kmpl).toBeCloseTo(10, 2);
  });

  it("ignora abastecimentos de outro combustível", () => {
    const segs = measuredSegments(
      [log("2026-08-01", 10_000, 40), log("2026-08-10", 10_500, 40, { fuel_type: "etanol" })],
      "gasolina",
    );
    expect(segs).toHaveLength(0);
  });

  it("descarta segmentos curtos, longos ou com km/L implausível", () => {
    expect(
      measuredSegments([log("2026-08-01", 10_000, 40), log("2026-08-02", 10_010, 40)]),
    ).toHaveLength(0);
    expect(
      measuredSegments([log("2026-08-01", 10_000, 5), log("2026-08-20", 12_000, 5)]),
    ).toHaveLength(0);
  });

  it("agrega por semana e devolve a média ponderada", () => {
    const segs = measuredSegments([
      log("2026-08-03", 10_000, 40),
      log("2026-08-05", 10_400, 40),
      log("2026-08-12", 10_900, 50),
    ]);
    expect(segs).toHaveLength(2);
    const weekly = weeklyMeasuredKmpl(segs);
    expect(weekly.size).toBe(2);
    expect(measuredAvgKmpl(segs)).toBeCloseTo(900 / 90, 2);
  });
});
