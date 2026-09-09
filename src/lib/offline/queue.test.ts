import { describe, expect, it } from "vitest";
import { backoffMs, stableId } from "./queue";
import { isPermanentError } from "./sync";

describe("backoffMs", () => {
  it("cresce a cada tentativa", () => {
    expect(backoffMs(1)).toBe(5_000);
    expect(backoffMs(2)).toBe(10_000);
    expect(backoffMs(3)).toBe(20_000);
  });

  it("não passa de 30 minutos", () => {
    expect(backoffMs(50)).toBe(30 * 60_000);
  });
});

describe("stableId", () => {
  it("repete o mesmo id para a mesma viagem", () => {
    const payload = { vehicle_id: "v1", start_time: "2026-09-09T10:00:00.000Z" };
    expect(stableId("trip", payload)).toBe(stableId("trip", payload));
  });

  it("separa viagens de carros diferentes", () => {
    const a = stableId("trip", { vehicle_id: "v1", start_time: "x" });
    const b = stableId("trip", { vehicle_id: "v2", start_time: "x" });
    expect(a).not.toBe(b);
  });

  it("gera id único quando falta horário de início", () => {
    const a = stableId("trip", { vehicle_id: "v1" });
    const b = stableId("trip", { vehicle_id: "v1" });
    expect(a).not.toBe(b);
  });
});

describe("isPermanentError", () => {
  it("reconhece erros definitivos", () => {
    expect(isPermanentError("23503")).toBe(true);
    expect(isPermanentError("42501")).toBe(true);
  });

  it("trata falha de rede/servidor como temporária", () => {
    expect(isPermanentError(undefined)).toBe(false);
    expect(isPermanentError("08006")).toBe(false);
    expect(isPermanentError("23505")).toBe(false);
  });
});
