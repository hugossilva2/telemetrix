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
  engineLoad?: number; // % de carga do motor (can.engine.load.level)
  headingDeg?: number; // rumo 0-360 (position.direction)
  canSpeedKmh?: number; // velocidade pelo CAN, quando disponível
  greenDrivingType?: string; // Green Driving nativo (se habilitado no rastreador)
  greenDrivingValue?: number;
  timestamp?: number; // epoch em segundos, se disponível
}


export type MqttStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";
