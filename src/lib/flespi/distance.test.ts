import { describe, expect, it } from "vitest";
import {
  accumIncrementKm,
  haversineKm,
  resolveTripDistanceKm,
} from "@/lib/flespi/distance";

// ~111 m por 0.001° de latitude
const LAT = -12.9777;
const LNG = -38.5016;

describe("accumIncrementKm", () => {
  it("soma o trecho entre duas posições plausíveis", () => {
    const km = accumIncrementKm({
      prevLat: LAT,
      prevLng: LNG,
      lat: LAT + 0.001,
      lng: LNG,
      dtSeconds: 20,
    });
    expect(km).toBeGreaterThan(0.1);
    expect(km).toBeLessThan(0.12);
  });

  it("ignora jitter de GPS abaixo de ~10 m", () => {
    const km = accumIncrementKm({
      prevLat: LAT,
      prevLng: LNG,
      lat: LAT + 0.00005, // ~5,5 m
      lng: LNG,
      dtSeconds: 20,
    });
    expect(km).toBe(0);
  });

  it("aceita exatamente no limiar de 10 m", () => {
    const km = accumIncrementKm({
      prevLat: LAT,
      prevLng: LNG,
      lat: LAT + 0.0002, // ~22 m
      lng: LNG,
      dtSeconds: 20,
    });
    expect(km).toBeGreaterThanOrEqual(0.01);
  });

  it("ignora salto que implicaria mais de 200 km/h", () => {
    // ~11 km em 20 s => ~2000 km/h
    const km = accumIncrementKm({
      prevLat: LAT,
      prevLng: LNG,
      lat: LAT + 0.1,
      lng: LNG,
      dtSeconds: 20,
    });
    expect(km).toBe(0);
  });

  it("aceita o mesmo salto quando o intervalo é compatível", () => {
    const km = accumIncrementKm({
      prevLat: LAT,
      prevLng: LNG,
      lat: LAT + 0.1,
      lng: LNG,
      dtSeconds: 600, // ~11 km em 10 min => ~67 km/h
    });
    expect(km).toBeGreaterThan(10);
  });

  it("sem intervalo conhecido, aplica só o piso de 10 m", () => {
    expect(
      accumIncrementKm({
        prevLat: LAT,
        prevLng: LNG,
        lat: LAT + 0.1,
        lng: LNG,
        dtSeconds: null,
      }),
    ).toBeGreaterThan(10);
  });

  it("devolve 0 quando faltam coordenadas", () => {
    expect(
      accumIncrementKm({ prevLat: null, prevLng: null, lat: LAT, lng: LNG, dtSeconds: 10 }),
    ).toBe(0);
    expect(
      accumIncrementKm({
        prevLat: LAT,
        prevLng: LNG,
        lat: undefined,
        lng: undefined,
        dtSeconds: 10,
      }),
    ).toBe(0);
  });
});

describe("resolveTripDistanceKm", () => {
  it("prioriza o delta de odômetro quando positivo", () => {
    expect(
      resolveTripDistanceKm({
        mileageStart: 100_000,
        mileageEnd: 100_012.5,
        accumKm: 11.9,
        startLat: LAT,
        startLng: LNG,
        endLat: LAT,
        endLng: LNG,
      }),
    ).toBe(12.5);
  });

  it("usa o acumulado quando o odômetro não veio (viagem circular)", () => {
    // ida e volta ao mesmo ponto: linha reta seria 0
    const km = resolveTripDistanceKm({
      mileageStart: null,
      mileageEnd: null,
      accumKm: 7.4,
      startLat: LAT,
      startLng: LNG,
      endLat: LAT,
      endLng: LNG,
    });
    expect(km).toBe(7.4);
  });

  it("ignora odômetro que não avançou e cai no acumulado", () => {
    expect(
      resolveTripDistanceKm({
        mileageStart: 100_000,
        mileageEnd: 100_000,
        accumKm: 3.2,
        startLat: LAT,
        startLng: LNG,
        endLat: LAT,
        endLng: LNG,
      }),
    ).toBe(3.2);
  });

  it("cai na linha reta início→fim como último recurso", () => {
    const straight = haversineKm(LAT, LNG, LAT + 0.05, LNG);
    expect(
      resolveTripDistanceKm({
        mileageStart: null,
        mileageEnd: null,
        accumKm: 0,
        startLat: LAT,
        startLng: LNG,
        endLat: LAT + 0.05,
        endLng: LNG,
      }),
    ).toBeCloseTo(straight, 6);
  });

  it("devolve 0 sem odômetro, sem acumulado e sem coordenadas", () => {
    expect(
      resolveTripDistanceKm({
        mileageStart: null,
        mileageEnd: null,
        accumKm: null,
        startLat: null,
        startLng: null,
        endLat: null,
        endLng: null,
      }),
    ).toBe(0);
  });

  it("viagem circular acumulada passa do piso de descarte (0,1 km)", () => {
    // mercado e volta: 20 pontos de ~110 m
    let accum = 0;
    for (let i = 0; i < 20; i++) {
      accum += accumIncrementKm({
        prevLat: LAT + i * 0.001,
        prevLng: LNG,
        lat: LAT + (i + 1) * 0.001,
        lng: LNG,
        dtSeconds: 20,
      });
    }
    const km = resolveTripDistanceKm({
      mileageStart: null,
      mileageEnd: null,
      accumKm: accum,
      startLat: LAT,
      startLng: LNG,
      endLat: LAT,
      endLng: LNG,
    });
    expect(km).toBeGreaterThan(2);
  });
});
