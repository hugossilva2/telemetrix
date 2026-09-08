import { getLastKnownTelemetry } from "./lastKnown.functions";
import type { VehicleTelemetry } from "./types";

/**
 * Seed inicial da telemetria: delega ao servidor, que detém o token da REST
 * API da Flespi. O browser nunca vê a credencial.
 */
export async function fetchLastKnownTelemetry(
  deviceId: string | null | undefined,
): Promise<(VehicleTelemetry & { receivedAt: number }) | null> {
  if (!deviceId) return null;
  try {
    return await getLastKnownTelemetry({ data: { deviceId } });
  } catch {
    return null;
  }
}
