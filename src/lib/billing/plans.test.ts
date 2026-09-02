import { describe, expect, it } from "vitest";
import {
  PLANS,
  countInMonth,
  limitLabel,
  limitStatus,
  limitValueLabel,
  limitsFor,
  limitsForMode,
} from "./plans";

describe("limitStatus", () => {
  it("bloqueia ao atingir o limite", () => {
    expect(limitStatus(5, 5)).toMatchObject({ atLimit: true, remaining: 0 });
    expect(limitStatus(4, 5)).toMatchObject({ atLimit: false, remaining: 1 });
  });
  it("nunca bloqueia sem limite", () => {
    const s = limitStatus(999, Number.POSITIVE_INFINITY);
    expect(s.atLimit).toBe(false);
    expect(s.remaining).toBe(Number.POSITIVE_INFINITY);
  });
  it("limite zero bloqueia de cara", () => {
    expect(limitStatus(0, 0).atLimit).toBe(true);
  });
});

describe("countInMonth", () => {
  it("conta só o mês civil de referência", () => {
    const now = new Date(2026, 8, 15);
    const items = [
      { occurred_at: new Date(2026, 8, 1, 0, 1).toISOString() },
      { occurred_at: new Date(2026, 8, 30, 23, 59).toISOString() },
      { occurred_at: new Date(2026, 7, 31, 23, 59).toISOString() },
      { occurred_at: new Date(2026, 9, 1, 0, 0).toISOString() },
    ];
    expect(countInMonth(items, now)).toBe(2);
  });
});

describe("planos por perfil", () => {
  it("todos os planos têm exemplo para os 4 perfis", () => {
    for (const p of PLANS) {
      for (const mode of ["motorista", "app", "instrutor", "autoescola"] as const) {
        expect(p.examples[mode].length).toBeGreaterThan(10);
      }
    }
  });
  it("limites crescem do Free ao Frota", () => {
    const f = limitsFor("free");
    const p = limitsFor("pro");
    const t = limitsFor("frota");
    expect(f.maxStudents).toBeLessThan(p.maxStudents);
    expect(p.maxStudents).toBeLessThanOrEqual(t.maxStudents);
    expect(f.maxInstructors).toBe(0);
    expect(f.ridesPerMonth).toBeLessThan(p.ridesPerMonth);
  });
  it("mostra os limites certos para cada perfil", () => {
    expect(limitsForMode("app")).toContain("ridesPerMonth");
    expect(limitsForMode("instrutor")).toContain("maxStudents");
    expect(limitsForMode("autoescola")).toContain("maxInstructors");
    expect(limitsForMode("motorista")).not.toContain("maxStudents");
  });
  it("rótulos de limite", () => {
    expect(limitLabel(5)).toBe("5");
    expect(limitLabel(Number.POSITIVE_INFINITY)).toBe("Ilimitados");
    expect(limitValueLabel("maxInstructors", limitsFor("free"))).toBe("Só o dono");
    expect(limitValueLabel("ridesPerMonth", limitsFor("pro"))).toBe("Ilimitadas");
    expect(limitValueLabel("historyDays", limitsFor("free"))).toBe("7 dias");
  });
});
