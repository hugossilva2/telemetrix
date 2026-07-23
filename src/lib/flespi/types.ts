// Telemetria normalizada do payload Teltonika FMC003 via Flespi.
// Todos os campos são opcionais — nem toda mensagem carrega todos os dados.
export interface VehicleTelemetry {
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  ignitionOn?: boolean;
  mileageKm?: number;
  batteryVoltage?: number;
  fuelLevel?: number; // 0-100 (%) quando o veículo está ligado
  engineRpm?: number;
  timestamp?: number; // epoch em segundos, se disponível
}

export type MqttStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";
