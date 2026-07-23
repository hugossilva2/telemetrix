import type { VehicleTelemetry } from "./types";

// O Flespi entrega o payload achatado com chaves como "position.latitude"
// OU aninhado. Suporta ambos.
function pick(obj: Record<string, unknown>, path: string): unknown {
  if (path in obj) return obj[path];
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

export function parseFlespiMessage(raw: string): VehicleTelemetry | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      latitude: num(pick(data, "position.latitude")),
      longitude: num(pick(data, "position.longitude")),
      speedKmh: num(pick(data, "position.speed")),
      ignitionOn: bool(pick(data, "engine.ignition.status")),
      mileageKm: num(pick(data, "vehicle.mileage")),
      batteryVoltage: num(pick(data, "battery.voltage")),
      fuelLevel: num(pick(data, "can.fuel.level")),
      engineRpm: num(pick(data, "can.engine.rpm")),
      timestamp: num(pick(data, "timestamp")),
    };
  } catch {
    return null;
  }
}

// Mescla telemetria nova sobre a anterior, preservando campos ausentes.
export function mergeTelemetry(
  prev: VehicleTelemetry,
  next: VehicleTelemetry,
): VehicleTelemetry {
  const merged: VehicleTelemetry = { ...prev };
  (Object.keys(next) as (keyof VehicleTelemetry)[]).forEach((k) => {
    const v = next[k];
    if (v !== undefined && v !== null) {
      (merged as Record<string, unknown>)[k] = v;
    }
  });
  return merged;
}
