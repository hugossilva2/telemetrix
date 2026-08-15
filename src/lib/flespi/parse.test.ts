import { describe, expect, it } from "vitest";
import { mergeTelemetry, parseFlespiMessage, parseFlespiStateTopic } from "@/lib/flespi/parse";

describe("parseFlespiMessage", () => {
  it("lê payload achatado", () => {
    const t = parseFlespiMessage(
      JSON.stringify({
        "position.latitude": -12.9,
        "position.longitude": -38.4,
        "position.speed": 42,
        "position.valid": true,
        "position.direction": 180,
        "position.satellites": 9,
        "engine.ignition.status": 1,
        "vehicle.mileage": 123456,
        "battery.voltage": 12.6,
        "can.fuel.level": 55,
        "can.engine.rpm": 2100,
        "can.engine.load.level": 34,
        "gsm.signal.level": 80,
        timestamp: 1700000000,
      }),
    );
    expect(t).toMatchObject({
      latitude: -12.9,
      longitude: -38.4,
      speedKmh: 42,
      ignitionOn: true,
      mileageKm: 123456,
      batteryVoltage: 12.6,
      fuelLevel: 55,
      engineRpm: 2100,
      engineLoad: 34,
      headingDeg: 180,
      positionValid: true,
      satellites: 9,
      gsmSignal: 80,
      timestamp: 1700000000,
    });
  });

  it("lê payload aninhado", () => {
    const t = parseFlespiMessage(
      JSON.stringify({
        position: { latitude: 1.5, longitude: 2.5, speed: 30, valid: true, direction: 90 },
        engine: { ignition: { status: false } },
        can: { engine: { rpm: 900 } },
      }),
    );
    expect(t).toMatchObject({
      latitude: 1.5,
      longitude: 2.5,
      speedKmh: 30,
      headingDeg: 90,
      ignitionOn: false,
      engineRpm: 900,
    });
  });

  it("usa a velocidade do CAN quando position.valid é false", () => {
    const t = parseFlespiMessage(
      JSON.stringify({
        "position.valid": false,
        "position.speed": 0,
        "can.vehicle.speed": 63,
      }),
    );
    expect(t?.speedKmh).toBe(63);
    expect(t?.canSpeedKmh).toBe(63);
  });

  it("mantém a velocidade do GPS quando há fix", () => {
    const t = parseFlespiMessage(
      JSON.stringify({
        "position.valid": true,
        "position.speed": 51,
        "can.vehicle.speed": 63,
      }),
    );
    expect(t?.speedKmh).toBe(51);
  });

  it("cai no CAN quando não há position.speed", () => {
    const t = parseFlespiMessage(
      JSON.stringify({ "position.valid": true, "can.vehicle.speed": 20 }),
    );
    expect(t?.speedKmh).toBe(20);
  });

  it("converte booleanos em várias formas", () => {
    const truthy = [true, 1, "1", "true"];
    for (const v of truthy) {
      expect(parseFlespiMessage(JSON.stringify({ "engine.ignition.status": v }))?.ignitionOn).toBe(
        true,
      );
    }
    const falsy = [false, 0, "0", "false"];
    for (const v of falsy) {
      expect(parseFlespiMessage(JSON.stringify({ "engine.ignition.status": v }))?.ignitionOn).toBe(
        false,
      );
    }
    expect(
      parseFlespiMessage(JSON.stringify({ "engine.ignition.status": "maybe" }))?.ignitionOn,
    ).toBeUndefined();
  });

  it("converte números em string e descarta valores inválidos", () => {
    const t = parseFlespiMessage(
      JSON.stringify({ "battery.voltage": "12.4", "can.engine.rpm": "abc" }),
    );
    expect(t?.batteryVoltage).toBe(12.4);
    expect(t?.engineRpm).toBeUndefined();
  });

  it("devolve null para JSON inválido, sem lançar", () => {
    expect(parseFlespiMessage("{not json")).toBeNull();
    expect(parseFlespiMessage("")).toBeNull();
  });
});

describe("parseFlespiStateTopic", () => {
  it("extrai a chave depois de /telemetry/", () => {
    const t = parseFlespiStateTopic("flespi/state/gw/devices/123/telemetry/can.engine.rpm", "2450");
    expect(t).toEqual({ engineRpm: 2450 });
  });

  it("trata o tópico position com objeto completo", () => {
    const t = parseFlespiStateTopic(
      "flespi/state/gw/devices/123/telemetry/position",
      JSON.stringify({ latitude: -10.1, longitude: -40.2, speed: 12, direction: 275 }),
    );
    expect(t).toEqual({
      latitude: -10.1,
      longitude: -40.2,
      speedKmh: 12,
      headingDeg: 275,
    });
  });

  it("aceita booleanos escalares", () => {
    expect(
      parseFlespiStateTopic("flespi/state/gw/devices/1/telemetry/engine.ignition.status", "true"),
    ).toEqual({ ignitionOn: true });
  });

  it("devolve null quando o tópico não é de telemetria ou a chave é desconhecida", () => {
    expect(parseFlespiStateTopic("flespi/message/gw/devices/1", "{}")).toBeNull();
    expect(parseFlespiStateTopic("flespi/state/gw/devices/1/telemetry/foo.bar", "1")).toBeNull();
  });
});

describe("mergeTelemetry", () => {
  it("preserva campos anteriores quando o novo é undefined ou null", () => {
    const prev = { speedKmh: 40, engineRpm: 2000, latitude: -1 };
    const merged = mergeTelemetry(prev, {
      speedKmh: undefined,
      engineRpm: null as unknown as number,
      latitude: -2,
    });
    expect(merged).toEqual({ speedKmh: 40, engineRpm: 2000, latitude: -2 });
  });

  it("aceita 0 e false como valores válidos", () => {
    const merged = mergeTelemetry(
      { speedKmh: 40, ignitionOn: true },
      { speedKmh: 0, ignitionOn: false },
    );
    expect(merged).toEqual({ speedKmh: 0, ignitionOn: false });
  });
});
