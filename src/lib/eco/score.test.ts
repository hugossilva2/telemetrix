import { describe, expect, it } from "vitest";
import { countEvents, ecoBand, formatIdle, summarizeEco } from "@/lib/eco/score";
import type { EcoEvent, EcoEventType, EcoSeverity } from "@/lib/eco/detect";

const T0 = 1_700_000_000_000;

function ev(
  type: EcoEventType,
  severity: EcoSeverity = "moderate",
  value = 0,
): EcoEvent {
  return {
    type,
    severity,
    value,
    t: T0,
    speedBefore: 40,
    speedAfter: 40,
    lat: null,
    lng: null,
  };
}

describe("countEvents", () => {
  it("conta por tipo", () => {
    const counts = countEvents([
      ev("harsh_brake"),
      ev("harsh_brake", "severe"),
      ev("overspeed"),
    ]);
    expect(counts).toEqual({
      harsh_brake: 2,
      harsh_accel: 0,
      harsh_corner: 0,
      overspeed: 1,
      high_rpm: 0,
    });
  });
});

describe("summarizeEco", () => {
  it("pontua 100 sem eventos e sem marcha lenta", () => {
    const s = summarizeEco({ events: [], idleSeconds: 0, distanceKm: 120, kmpl: 12 });
    expect(s.score).toBe(100);
    expect(s.totalEvents).toBe(0);
    expect(s.wastedFuelLiters).toBe(0);
    expect(s.wastedCost).toBe(0);
  });

  it("normaliza por 100 km: dobrar a distância corta a penalidade pela metade", () => {
    const events = [ev("harsh_brake", "severe"), ev("harsh_brake", "severe")]; // 8 pontos
    const in100 = summarizeEco({ events, idleSeconds: 0, distanceKm: 100, kmpl: 12 });
    const in200 = summarizeEco({ events, idleSeconds: 0, distanceKm: 200, kmpl: 12 });
    expect(in100.score).toBe(92);
    expect(in200.score).toBe(96);
  });

  it("marcha lenta: 5 min parado tira exatamente 1 ponto por 100 km", () => {
    const s = summarizeEco({
      events: [],
      idleSeconds: 300,
      distanceKm: 100,
      kmpl: 12,
    });
    expect(s.score).toBe(99);
    expect(s.idleSeconds).toBe(300);
  });

  it("penaliza high_rpm proporcionalmente ao excesso sobre a faixa econômica", () => {
    const base = summarizeEco({
      events: [ev("high_rpm", "moderate", 2500)], // sem excesso
      idleSeconds: 0,
      distanceKm: 100,
      kmpl: 12,
    });
    const over = summarizeEco({
      events: [ev("high_rpm", "moderate", 4500)], // 2000 rpm de excesso => +3 pontos
      idleSeconds: 0,
      distanceKm: 100,
      kmpl: 12,
    });
    expect(base.score).toBe(99); // 1 ponto do evento moderado
    expect(over.score).toBe(96); // 1 + 3
    expect(over.wastedFuelLiters).toBeGreaterThan(base.wastedFuelLiters);
  });

  it("limita wastedFuelLiters a 25% do consumo da viagem", () => {
    const events = Array.from({ length: 200 }, () => ev("overspeed", "severe"));
    const distanceKm = 10;
    const kmpl = 10;
    const s = summarizeEco({ events, idleSeconds: 0, distanceKm, kmpl });
    const tripLiters = distanceKm / kmpl; // 1 L
    expect(s.wastedFuelLiters).toBeCloseTo(tripLiters * 0.25, 3);
  });

  it("satura o score em [0, 100]", () => {
    const many = Array.from({ length: 500 }, () => ev("harsh_brake", "severe"));
    const worst = summarizeEco({ events: many, idleSeconds: 0, distanceKm: 5, kmpl: 12 });
    expect(worst.score).toBe(0);
    expect(worst.score).toBeGreaterThanOrEqual(0);

    const best = summarizeEco({ events: [], idleSeconds: 0, distanceKm: 1000, kmpl: 12 });
    expect(best.score).toBe(100);
  });

  it("calcula o custo com o preço informado", () => {
    const s = summarizeEco({
      events: [ev("harsh_accel", "severe")], // 0,04 L
      idleSeconds: 0,
      distanceKm: 100,
      kmpl: 12,
      pricePerLiter: 10,
    });
    expect(s.wastedFuelLiters).toBeCloseTo(0.04, 3);
    expect(s.wastedCost).toBeCloseTo(0.4, 2);
  });

  it("usa a referência Inmetro quando kmpl não é informado", () => {
    const urbano = summarizeEco({
      events: [ev("overspeed", "severe")],
      idleSeconds: 0,
      distanceKm: 1,
      fuel: "gasolina",
      avgSpeedKmh: 20,
    });
    const rodovia = summarizeEco({
      events: [ev("overspeed", "severe")],
      idleSeconds: 0,
      distanceKm: 1,
      fuel: "gasolina",
      avgSpeedKmh: 90,
    });
    // ciclo rodoviário rende mais km/l => teto de desperdício menor
    expect(rodovia.wastedFuelLiters).toBeLessThan(urbano.wastedFuelLiters);
  });
});

describe("ecoBand", () => {
  it("acerta as faixas nos limites exatos", () => {
    expect(ecoBand(100).label).toBe("Excelente");
    expect(ecoBand(90).label).toBe("Excelente");
    expect(ecoBand(89).label).toBe("Bom");
    expect(ecoBand(75).label).toBe("Bom");
    expect(ecoBand(74).label).toBe("Regular");
    expect(ecoBand(60).label).toBe("Regular");
    expect(ecoBand(59).label).toBe("Agressivo");
    expect(ecoBand(0).label).toBe("Agressivo");
  });

  it("devolve 'Sem dados' para undefined e NaN", () => {
    expect(ecoBand(undefined).label).toBe("Sem dados");
    expect(ecoBand(Number.NaN).label).toBe("Sem dados");
  });

  // Comportamento ATUAL, documentado sem correção: Number(null) === 0, então um
  // score nulo cai na faixa "Agressivo" em vez de "Sem dados". Achado reportado.
  it("hoje trata null como 0 e devolve 'Agressivo'", () => {
    expect(ecoBand(null).label).toBe("Agressivo");
  });
});

describe("formatIdle", () => {
  it("formata minutos e horas", () => {
    expect(formatIdle(0)).toBe("0 min");
    expect(formatIdle(300)).toBe("5 min");
    expect(formatIdle(3600)).toBe("1h 0min");
    expect(formatIdle(5400)).toBe("1h 30min");
  });
});
