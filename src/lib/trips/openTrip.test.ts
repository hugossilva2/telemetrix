import { describe, expect, it } from "vitest";
import { openTripDistanceKm } from "./openTrip";

describe("openTripDistanceKm", () => {
  it("retorna null sem viagem aberta", () => {
    expect(openTripDistanceKm(null)).toBeNull();
    expect(openTripDistanceKm(undefined)).toBeNull();
  });

  it("usa o odômetro quando disponível", () => {
    expect(openTripDistanceKm({ mileageAtStart: 1000, lastMileage: 1012.5 })).toBeCloseTo(12.5);
  });

  it("ignora odômetro inconsistente e usa o GPS", () => {
    const km = openTripDistanceKm({
      mileageAtStart: 1000,
      lastMileage: 990,
      startLat: -12.97,
      startLng: -38.5,
      lastLat: -12.98,
      lastLng: -38.5,
    });
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.3);
  });

  it("retorna null sem odômetro e sem coordenadas", () => {
    expect(openTripDistanceKm({ mileageAtStart: null, lastMileage: null })).toBeNull();
  });
});
