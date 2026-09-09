import { getLastKnownTelemetry } from "./lastKnown.functions";
import type { VehicleTelemetry } from "./types";

/**
 * Seed inicial da telemetria: delega ao servidor, que detém o token da REST
 * API da Flespi e confere se a conta pode ler aquele veículo. O browser nunca
 * vê a credencial nem escolhe o rastreador.
 */
export async function fetchLastKnownTelemetry(
  vehicleId: string | null | undefined,
): Promise<(VehicleTelemetry & { receivedAt: number }) | null> {
  if (!vehicleId) return null;
  try {
    return await getLastKnownTelemetry({ data: { vehicleId } });
  } catch {
    return null;
  }
}
