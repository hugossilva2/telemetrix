import { useTelemetryContext } from "@/components/telemetry/TelemetryProvider";
import type { VehicleTelemetry } from "@/lib/flespi/types";
import type { SavedObdDevice } from "@/lib/obd/device";
import type { TelemetrySource, TelemetryStatus } from "@/lib/telemetry/types";

export interface UseTelemetryResult {
  /** Compatível com o antigo `useFlespiMqtt()`. */
  status: TelemetryStatus;
  telemetry: VehicleTelemetry;
  lastMessageAt: number | null;
  error: string | null;
  source: TelemetrySource;
  supported?: boolean;
  deviceName?: string | null;
  savedDevice?: SavedObdDevice | null;
  progress?: string | null;
  forgetDevice?: () => void;
  connect?: () => Promise<void>;
  disconnect?: () => void;
}

/**
 * Ponto único de leitura da telemetria na UI. A origem real (nuvem FMC003 ou
 * adaptador OBD-II local) é decidida pelo TelemetryProvider.
 */
export function useTelemetry(): UseTelemetryResult {
  const state = useTelemetryContext();
  return {
    status: state.status,
    telemetry: state.data,
    lastMessageAt: state.lastMessageAt,
    error: state.error,
    source: state.source,
    supported: state.supported,
    deviceName: state.deviceName,
    savedDevice: state.savedDevice,
    progress: state.progress,
    forgetDevice: state.forgetDevice,
    connect: state.connect,
    disconnect: state.disconnect,
  };
}

