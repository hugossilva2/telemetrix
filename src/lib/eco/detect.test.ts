import { describe, expect, it } from "vitest";
import {
  DEFAULT_ECO_THRESHOLDS,
  detectBetween,
  detectEcoEvents,
  idleBetween,
  type EcoSample,
  type EcoThresholds,
} from "@/lib/eco/detect";

const T0 = 1_700_000_000_000;

/** Limites explícitos: não dependem da ficha do veículo padrão. */
const TH: EcoThresholds = {
  brakeModerate: 8,
  brakeSevere: 12,
  accelModerate: 6,
  accelSevere: 8.7,
  lateralG: 0.35,
  lateralGSevere: 0.5,
  maxSpeedKmh: 110,
  maxRpm: 3200,
};

function s(partial: Partial<EcoSample> & { t: number; speed: number }): EcoSample {
  return { ...partial };
}

describe("detectBetween — freada", () => {
  it("marca harsh_brake moderado a partir de -8 km/h/s", () => {
    const events = detectBetween(
      s({ t: T0, speed: 50 }),
      s({ t: T0 + 2000, speed: 34 }), // -8 km/h/s
      TH,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("harsh_brake");
    expect(events[0].severity).toBe("moderate");
    expect(events[0].value).toBe(8);
  });

  it("marca severe a partir de -12 km/h/s", () => {
    const events = detectBetween(
      s({ t: T0, speed: 60 }),
      s({ t: T0 + 2000, speed: 36 }), // -12 km/h/s
      TH,
    );
    expect(events[0].severity).toBe("severe");
  });

  it("não marca nada abaixo do limite moderado", () => {
    const events = detectBetween(
      s({ t: T0, speed: 50 }),
      s({ t: T0 + 2000, speed: 36 }), // -7 km/h/s
      TH,
    );
    expect(events).toEqual([]);
  });
});

describe("detectBetween — aceleração", () => {
  it("marca harsh_accel moderado acima de accelModerate", () => {
    const events = detectBetween(
      s({ t: T0, speed: 10 }),
      s({ t: T0 + 2000, speed: 24 }), // +7 km/h/s
      TH,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("harsh_accel");
    expect(events[0].severity).toBe("moderate");
  });

  it("marca severe quando a carga do motor é >= 75 mesmo em faixa moderada", () => {
    const events = detectBetween(
      s({ t: T0, speed: 10 }),
      s({ t: T0 + 2000, speed: 24, load: 75 }),
      TH,
    );
    expect(events[0].severity).toBe("severe");
  });

  it("marca severe acima de accelSevere", () => {
    const events = detectBetween(
      s({ t: T0, speed: 0 }),
      s({ t: T0 + 2000, speed: 20 }), // +10 km/h/s
      TH,
    );
    expect(events[0].severity).toBe("severe");
  });
});

describe("detectBetween — guards de intervalo", () => {
  it("ignora pares com dt < 1 s", () => {
    expect(
      detectBetween(s({ t: T0, speed: 60 }), s({ t: T0 + 500, speed: 10 }), TH),
    ).toEqual([]);
  });

  it("ignora pares com dt > 30 s", () => {
    expect(
      detectBetween(s({ t: T0, speed: 60 }), s({ t: T0 + 31_000, speed: 0 }), TH),
    ).toEqual([]);
  });

  it("aceita exatamente dt = 1 s e dt = 30 s", () => {
    expect(
      detectBetween(s({ t: T0, speed: 60 }), s({ t: T0 + 1000, speed: 40 }), TH),
    ).toHaveLength(1);
    expect(
      detectBetween(s({ t: T0, speed: 300 }), s({ t: T0 + 30_000, speed: 0 }), TH),
    ).toHaveLength(1);
  });
});

describe("detectBetween — overspeed e high_rpm só na transição", () => {
  it("dispara overspeed ao cruzar o limite", () => {
    const events = detectBetween(
      s({ t: T0, speed: 108 }),
      s({ t: T0 + 5000, speed: 115 }),
      TH,
    );
    expect(events.map((e) => e.type)).toContain("overspeed");
  });

  it("não repete overspeed enquanto continua acima do limite", () => {
    const events = detectBetween(
      s({ t: T0, speed: 115 }),
      s({ t: T0 + 5000, speed: 118 }),
      TH,
    );
    expect(events.map((e) => e.type)).not.toContain("overspeed");
  });

  it("marca overspeed severe acima de limite + 20", () => {
    const events = detectBetween(
      s({ t: T0, speed: 100 }),
      s({ t: T0 + 5000, speed: 135 }),
      TH,
    );
    const over = events.find((e) => e.type === "overspeed");
    expect(over?.severity).toBe("severe");
  });

  it("dispara high_rpm apenas na transição", () => {
    const first = detectBetween(
      s({ t: T0, speed: 40, rpm: 3000 }),
      s({ t: T0 + 5000, speed: 45, rpm: 3400 }),
      TH,
    );
    expect(first.map((e) => e.type)).toContain("high_rpm");

    const second = detectBetween(
      s({ t: T0, speed: 45, rpm: 3400 }),
      s({ t: T0 + 5000, speed: 46, rpm: 3500 }),
      TH,
    );
    expect(second.map((e) => e.type)).not.toContain("high_rpm");
  });

  it("marca high_rpm severe acima de maxRpm + 800", () => {
    const events = detectBetween(
      s({ t: T0, speed: 40, rpm: 3000 }),
      s({ t: T0 + 5000, speed: 45, rpm: 4100 }),
      TH,
    );
    expect(events.find((e) => e.type === "high_rpm")?.severity).toBe("severe");
  });
});

describe("detectBetween — Green Driving nativo", () => {
  it("tem precedência e retorna sozinho", () => {
    const events = detectBetween(
      s({ t: T0, speed: 60, rpm: 3000 }),
      s({
        t: T0 + 2000,
        speed: 20,
        rpm: 4200,
        greenDrivingType: "2",
        greenDrivingValue: 0.5,
      }),
      TH,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "harsh_brake",
      severity: "severe",
      native: true,
      value: 0.5,
    });
  });

  it("aceita rótulos textuais e ignora tipos desconhecidos", () => {
    const cornering = detectBetween(
      s({ t: T0, speed: 40 }),
      s({ t: T0 + 2000, speed: 40, greenDrivingType: "cornering", greenDrivingValue: 0.3 }),
      TH,
    );
    expect(cornering[0]).toMatchObject({ type: "harsh_corner", severity: "moderate" });

    const unknown = detectBetween(
      s({ t: T0, speed: 60 }),
      s({ t: T0 + 2000, speed: 36, greenDrivingType: "whatever" }),
      TH,
    );
    // cai na detecção derivada
    expect(unknown[0]?.native).toBeUndefined();
    expect(unknown[0]?.type).toBe("harsh_brake");
  });
});

describe("detectBetween — delta de rumo", () => {
  it("trata 350° -> 10° como 20°, não 340°", () => {
    // 20° em 1 s a 40 km/h -> ~0,39 g (acima de 0,35) => curva moderada
    const wrapped = detectBetween(
      s({ t: T0, speed: 40, heading: 350 }),
      s({ t: T0 + 1000, speed: 40, heading: 10 }),
      TH,
    );
    const corner = wrapped.find((e) => e.type === "harsh_corner");
    expect(corner).toBeDefined();
    expect(corner!.value).toBeLessThan(0.5);
    expect(corner!.severity).toBe("moderate");

    // Se fosse 340°, o valor lateral seria ~17x maior (severe).
    const real340 = detectBetween(
      s({ t: T0, speed: 40, heading: 0 }),
      s({ t: T0 + 1000, speed: 40, heading: 170 }),
      TH,
    );
    expect(real340.find((e) => e.type === "harsh_corner")!.value).toBeGreaterThan(
      corner!.value,
    );
  });

  it("ignora curva abaixo de 15 km/h", () => {
    const events = detectBetween(
      s({ t: T0, speed: 10, heading: 0 }),
      s({ t: T0 + 1000, speed: 12, heading: 60 }),
      TH,
    );
    expect(events.map((e) => e.type)).not.toContain("harsh_corner");
  });
});

describe("idleBetween", () => {
  it("conta os segundos quando ambas as amostras estão <= 2 km/h", () => {
    expect(idleBetween(s({ t: T0, speed: 0 }), s({ t: T0 + 30_000, speed: 2 }))).toBe(30);
  });

  it("não conta quando uma das amostras está acima de 2 km/h", () => {
    expect(idleBetween(s({ t: T0, speed: 0 }), s({ t: T0 + 30_000, speed: 3 }))).toBe(0);
  });

  it("devolve 0 para dt acima de 600 s", () => {
    expect(idleBetween(s({ t: T0, speed: 0 }), s({ t: T0 + 601_000, speed: 0 }))).toBe(0);
    expect(idleBetween(s({ t: T0, speed: 0 }), s({ t: T0 + 600_000, speed: 0 }))).toBe(600);
  });

  it("devolve 0 para dt não positivo", () => {
    expect(idleBetween(s({ t: T0, speed: 0 }), s({ t: T0, speed: 0 }))).toBe(0);
  });
});

describe("detectEcoEvents", () => {
  it("ordena as amostras e acumula eventos e marcha lenta", () => {
    const { events, idleSeconds } = detectEcoEvents(
      [
        s({ t: T0 + 4000, speed: 0 }),
        s({ t: T0, speed: 0 }),
        s({ t: T0 + 2000, speed: 0 }),
        s({ t: T0 + 6000, speed: 30 }),
        s({ t: T0 + 8000, speed: 6 }),
      ],
      TH,
    );
    expect(idleSeconds).toBe(4);
    expect(events.map((e) => e.type)).toEqual(["harsh_accel", "harsh_brake"]);
  });

  it("usa os limites derivados da ficha por padrão", () => {
    expect(DEFAULT_ECO_THRESHOLDS.brakeModerate).toBe(8);
    expect(DEFAULT_ECO_THRESHOLDS.brakeSevere).toBe(12);
    expect(DEFAULT_ECO_THRESHOLDS.accelSevere).toBeGreaterThan(
      DEFAULT_ECO_THRESHOLDS.accelModerate,
    );
  });
});
