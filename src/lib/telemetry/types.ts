import type { MqttStatus, VehicleTelemetry } from "@/lib/flespi/types";

/** Fonte de hardware da telemetria. */
export type TelemetrySource = "fmc003" | "elm327";

/** Status unificado das duas fontes (reaproveita o vocabulário do MQTT). */
export type TelemetryStatus = MqttStatus;

export interface TelemetryState {
  source: TelemetrySource;
  status: TelemetryStatus;
  data: VehicleTelemetry;
  lastMessageAt: number | null;
  error: string | null;
  /** Só disponível no modo ELM327 (Bluetooth local). */
  connect?: () => Promise<void>;
  disconnect?: () => void;
  deviceName?: string | null;
  supported?: boolean;
}

export const SOURCE_LABEL: Record<TelemetrySource, string> = {
  fmc003: "Equipamento dedicado (nuvem)",
  elm327: "Adaptador OBD-II (Bluetooth)",
};

export const SOURCE_SHORT: Record<TelemetrySource, string> = {
  fmc003: "Nuvem",
  elm327: "Bluetooth",
};
