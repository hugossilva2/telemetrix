import { describe, expect, it } from "vitest";
import { resolveKmpl, tripFuelLiters, IDLE_LITERS_PER_HOUR } from "./consumption";
import { expectedKmpl } from "@/lib/vehicles/specs";

describe("resolveKmpl", () => {
  it("usa a calibração medida quando há 2+ amostras", () => {
    const r = resolveKmpl({
      calibration: { kmpl: 12.4, samples: 3 },
      vehicleKmpl: 9,
      fuel: "gasolina",
      avgSpeedKmh: 40,
    });
    expect(r).toEqual({ kmpl: 12.4, source: "calibrado" });
  });

  it("ignora calibração com poucas amostras e usa o valor do veículo", () => {
    const r = resolveKmpl({
      calibration: { kmpl: 12.4, samples: 1 },
      vehicleKmpl: 9,
      fuel: "gasolina",
      avgSpeedKmh: 40,
    });
    expect(r).toEqual({ kmpl: 9, source: "calibrado" });
  });

  it("cai para a ficha técnica quando nada foi preenchido", () => {
    const r = resolveKmpl({
      calibration: null,
      vehicleKmpl: null,
      fuel: "gasolina",
      avgSpeedKmh: 90,
    });
    expect(r.source).toBe("ficha");
    expect(r.kmpl).toBeCloseTo(expectedKmpl({ fuel: "gasolina", avgSpeedKmh: 90 }), 5);
    expect(r.kmpl).toBeGreaterThan(0);
  });

  it("não devolve 10 km/L fixo", () => {
    const r = resolveKmpl({ fuel: "etanol", avgSpeedKmh: 30 });
    expect(r.kmpl).not.toBe(10);
  });
});

describe("tripFuelLiters", () => {
  it("soma a marcha lenta ao consumo de rodagem", () => {
    const liters = tripFuelLiters({ distanceKm: 100, kmpl: 10, idleSeconds: 3600 });
    expect(liters).toBeCloseTo(10 + IDLE_LITERS_PER_HOUR, 3);
  });

  it("aceita litros/hora de marcha lenta customizado", () => {
    const liters = tripFuelLiters({
      distanceKm: 50,
      kmpl: 10,
      idleSeconds: 1800,
      idleLitersPerHour: 1,
    });
    expect(liters).toBeCloseTo(5.5, 3);
  });

  it("sem marcha lenta é só distância / km/L", () => {
    expect(tripFuelLiters({ distanceKm: 30, kmpl: 12 })).toBeCloseTo(2.5, 3);
  });

  it("retorna null com km/L nulo, zero ou negativo", () => {
    expect(tripFuelLiters({ distanceKm: 10, kmpl: null })).toBeNull();
    expect(tripFuelLiters({ distanceKm: 10, kmpl: 0 })).toBeNull();
    expect(tripFuelLiters({ distanceKm: 10, kmpl: -5 })).toBeNull();
    expect(tripFuelLiters({ distanceKm: 10, kmpl: Number.NaN })).toBeNull();
  });
});
