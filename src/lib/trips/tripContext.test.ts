import { describe, expect, it } from "vitest";
import { matchesTripContext } from "./store";

const trip = { ownerId: "u1", vehicleId: "v1", source: "fmc003" };

describe("matchesTripContext", () => {
  it("continua a viagem no mesmo contexto", () => {
    expect(matchesTripContext(trip, { ownerId: "u1", vehicleId: "v1", source: "fmc003" })).toBe(
      true,
    );
  });

  it("descarta viagem de outra conta", () => {
    expect(matchesTripContext(trip, { ownerId: "u2", vehicleId: "v1", source: "fmc003" })).toBe(
      false,
    );
  });

  it("descarta viagem de outro carro", () => {
    expect(matchesTripContext(trip, { ownerId: "u1", vehicleId: "v2", source: "fmc003" })).toBe(
      false,
    );
  });

  it("descarta viagem de outra origem de dados", () => {
    expect(matchesTripContext(trip, { ownerId: "u1", vehicleId: "v1", source: "elm327" })).toBe(
      false,
    );
  });

  it("não invalida quando o contexto ainda é desconhecido", () => {
    expect(matchesTripContext(trip, { ownerId: null, vehicleId: null, source: null })).toBe(true);
    expect(
      matchesTripContext({ ownerId: null, vehicleId: null, source: null }, { ownerId: "u1" }),
    ).toBe(true);
  });
});
