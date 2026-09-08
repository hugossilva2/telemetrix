import { describe, expect, it } from "vitest";
import { historicalKmpl, litersAddedAfter, type FuelFill, type TankAnchor } from "./tankEstimate";

const fill = (
  date: string,
  odometerKm: number,
  liters: number,
  options: { isFullTank?: boolean; fuelType?: string } = {},
): FuelFill => ({
  date,
  odometerKm,
  liters,
  isFullTank: options.isFullTank ?? true,
  fuelType: options.fuelType ?? "gasolina",
  vehicleId: "vehicle-1",
});

describe("historicalKmpl", () => {
  it("ignora parciais no km/L, mas preserva seus litros para estimar o tanque", () => {
    const fills = [
      fill("2026-08-10T10:00:00Z", 1300, 30),
      fill("2026-08-05T10:00:00Z", 1150, 10, { isFullTank: false }),
      fill("2026-08-01T10:00:00Z", 1000, 30),
    ];
    expect(historicalKmpl(fills, "gasolina")).toBe(10);

    const anchor: TankAnchor = {
      liters: 20,
      odometerKm: 1000,
      at: "2026-08-02T10:00:00Z",
    };
    expect(litersAddedAfter(anchor, fills)).toBe(40);
  });

  it("não mistura combustíveis consecutivos", () => {
    const fills = [
      fill("2026-08-10T10:00:00Z", 1300, 30, { fuelType: "etanol" }),
      fill("2026-08-01T10:00:00Z", 1000, 30, { fuelType: "gasolina" }),
    ];
    expect(historicalKmpl(fills)).toBeNull();
  });

  it("calcula somente o combustível ativo", () => {
    const fills = [
      fill("2026-08-20T10:00:00Z", 1600, 30, { fuelType: "etanol" }),
      fill("2026-08-10T10:00:00Z", 1300, 30, { fuelType: "etanol" }),
      fill("2026-08-01T10:00:00Z", 1000, 30, { fuelType: "gasolina" }),
    ];
    expect(historicalKmpl(fills, "etanol")).toBe(10);
    expect(historicalKmpl(fills, "gasolina")).toBeNull();
  });
});