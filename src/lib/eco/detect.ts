// Detecção de eventos de direção agressiva.
//
// O rastreador FMC003 conectado hoje NÃO envia Green Driving nem os eixos do
// acelerômetro (verificado na API da Flespi). Por isso derivamos os eventos da
// velocidade, do rumo (position.direction), do RPM e da carga do motor, que
// chegam a cada ~6 s. Se um dia as chaves nativas aparecerem, o parser
// preenche `greenDrivingType/Value` e a detecção nativa tem prioridade.

export type EcoEventType =
  | "harsh_brake"
  | "harsh_accel"
  | "harsh_corner"
  | "overspeed"
  | "high_rpm";

export type EcoSeverity = "moderate" | "severe";

export interface EcoSample {
  t: number; // epoch ms
  speed: number; // km/h
  heading?: number | null; // graus 0-360
  rpm?: number | null;
  load?: number | null; // % carga do motor
  lat?: number | null;
  lng?: number | null;
  greenDrivingType?: string | null;
  greenDrivingValue?: number | null;
}

export interface EcoEvent {
  type: EcoEventType;
  t: number;
  severity: EcoSeverity;
  /** km/h por segundo (freada/aceleração), g (curva), km/h (velocidade) ou rpm */
  value: number;
  speedBefore: number;
  speedAfter: number;
  lat: number | null;
  lng: number | null;
  /** true quando veio do Green Driving nativo do rastreador */
  native?: boolean;
}

export interface EcoThresholds {
  brakeModerate: number; // km/h/s
  brakeSevere: number;
  accelModerate: number;
  accelSevere: number;
  lateralG: number;
  lateralGSevere: number;
  maxSpeedKmh: number;
  maxRpm: number;
}

/**
 * Limites derivados da ficha técnica do veículo ativo.
 * - aceleração: 100 km/h ÷ 11,5 s ≈ 8,7 km/h/s é o máximo de fábrica; 70%
 *   disso já é uma arrancada agressiva para um 1.3 Firefly.
 * - freada: traseira a tambor pede antecipação, então 8 / 12 km/h/s.
 * - giro: acima da faixa econômica (1.500-2.500 rpm) o consumo dispara.
 */
export function thresholdsFromSpec(spec: VehicleSpec = ACTIVE_SPEC): EcoThresholds {
  const refAccel = referenceAccelKmhPerS(spec);
  return {
    brakeModerate: 8,
    brakeSevere: 12,
    accelModerate: Number((refAccel * 0.7).toFixed(1)),
    accelSevere: Number(refAccel.toFixed(1)),
    lateralG: 0.35,
    lateralGSevere: 0.5,
    maxSpeedKmh: 110,
    maxRpm: Math.round(spec.ecoRpm.max + 700),
  };
}

export const DEFAULT_ECO_THRESHOLDS: EcoThresholds = thresholdsFromSpec();


const MIN_DT_S = 1;
const MAX_DT_S = 30;
const G = 9.80665;

function headingDelta(a: number, b: number) {
  let d = Math.abs(b - a) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function nativeEvent(cur: EcoSample): EcoEvent | null {
  const type = (cur.greenDrivingType ?? "").toString().toLowerCase();
  if (!type) return null;
  const value = Number(cur.greenDrivingValue) || 0;
  const map: Record<string, EcoEventType> = {
    "1": "harsh_accel",
    "2": "harsh_brake",
    "3": "harsh_corner",
    acceleration: "harsh_accel",
    accelerating: "harsh_accel",
    braking: "harsh_brake",
    brake: "harsh_brake",
    cornering: "harsh_corner",
    corner: "harsh_corner",
  };
  const mapped = map[type];
  if (!mapped) return null;
  return {
    type: mapped,
    t: cur.t,
    severity: value >= 0.45 ? "severe" : "moderate",
    value,
    speedBefore: cur.speed,
    speedAfter: cur.speed,
    lat: cur.lat ?? null,
    lng: cur.lng ?? null,
    native: true,
  };
}

/** Compara duas amostras consecutivas e devolve os eventos detectados. */
export function detectBetween(
  prev: EcoSample,
  cur: EcoSample,
  th: EcoThresholds = DEFAULT_ECO_THRESHOLDS,
): EcoEvent[] {
  const native = nativeEvent(cur);
  if (native) return [native];

  const dt = (cur.t - prev.t) / 1000;
  if (!Number.isFinite(dt) || dt < MIN_DT_S || dt > MAX_DT_S) return [];

  const events: EcoEvent[] = [];
  const base = {
    t: cur.t,
    speedBefore: prev.speed,
    speedAfter: cur.speed,
    lat: cur.lat ?? null,
    lng: cur.lng ?? null,
  };

  const dv = (cur.speed - prev.speed) / dt; // km/h por segundo

  if (dv <= -th.brakeModerate) {
    events.push({
      ...base,
      type: "harsh_brake",
      severity: -dv >= th.brakeSevere ? "severe" : "moderate",
      value: Math.abs(Number(dv.toFixed(2))),
    });
  } else if (dv >= th.accelModerate) {
    const heavyLoad = (cur.load ?? 0) >= 75;
    events.push({
      ...base,
      type: "harsh_accel",
      severity: dv >= th.accelSevere || heavyLoad ? "severe" : "moderate",
      value: Number(dv.toFixed(2)),
    });
  }

  // Curva: aceleração lateral estimada = v * (Δrumo em rad/s)
  if (
    typeof prev.heading === "number" &&
    typeof cur.heading === "number" &&
    cur.speed > 15
  ) {
    const deg = headingDelta(prev.heading, cur.heading);
    const omega = (deg * Math.PI) / 180 / dt; // rad/s
    const vMs = ((prev.speed + cur.speed) / 2) / 3.6;
    const lateralG = (vMs * omega) / G;
    if (lateralG >= th.lateralG) {
      events.push({
        ...base,
        type: "harsh_corner",
        severity: lateralG >= th.lateralGSevere ? "severe" : "moderate",
        value: Number(lateralG.toFixed(2)),
      });
    }
  }

  if (cur.speed > th.maxSpeedKmh && prev.speed <= th.maxSpeedKmh) {
    events.push({
      ...base,
      type: "overspeed",
      severity: cur.speed > th.maxSpeedKmh + 20 ? "severe" : "moderate",
      value: Number(cur.speed.toFixed(0)),
    });
  }

  if (
    typeof cur.rpm === "number" &&
    cur.rpm > th.maxRpm &&
    (prev.rpm ?? 0) <= th.maxRpm
  ) {
    events.push({
      ...base,
      type: "high_rpm",
      severity: cur.rpm > th.maxRpm + 800 ? "severe" : "moderate",
      value: Math.round(cur.rpm),
    });
  }

  return events;
}

export interface EcoDetection {
  events: EcoEvent[];
  idleSeconds: number;
}

/** Percorre uma série de amostras (viagem inteira ou histórico importado). */
export function detectEcoEvents(
  samples: EcoSample[],
  th: EcoThresholds = DEFAULT_ECO_THRESHOLDS,
): EcoDetection {
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const events: EcoEvent[] = [];
  let idleSeconds = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    events.push(...detectBetween(prev, cur, th));
    idleSeconds += idleBetween(prev, cur);
  }

  return { events, idleSeconds };
}

/** Segundos parados com motor ligado entre duas amostras. */
export function idleBetween(prev: EcoSample, cur: EcoSample): number {
  const dt = (cur.t - prev.t) / 1000;
  if (!Number.isFinite(dt) || dt <= 0 || dt > 600) return 0;
  if (prev.speed <= 2 && cur.speed <= 2) return dt;
  return 0;
}
