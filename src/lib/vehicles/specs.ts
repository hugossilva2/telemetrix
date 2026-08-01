// Ficha técnica do veículo usada para calibrar detecção de eventos,
// metas de consumo e a nota de desempenho ao vivo.

export type FuelKind = "etanol" | "gasolina" | "misto";

export interface VehicleSpec {
  name: string;
  year: number;
  engine: string;
  displacementCc: number;
  cylinders: number;
  valves: number;
  powerCvEthanol: number;
  powerCvGasoline: number;
  powerRpm: number;
  torqueKgfmEthanol: number;
  torqueKgfmGasoline: number;
  torqueRpm: number;
  zeroTo100S: number;
  topSpeedKmh: number;
  gearbox: string;
  traction: string;
  steering: string;
  suspensionFront: string;
  suspensionRear: string;
  brakesFront: string;
  brakesRear: string;
  brakeSystem: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  wheelbaseMm: number;
  groundClearanceMm: number;
  curbWeightKg: number;
  payloadKg: number;
  trunkL: number;
  tankL: number;
  wheels: string;
  tires: string;
  /** consumo Inmetro em km/l */
  consumption: {
    etanol: { urban: number; highway: number };
    gasolina: { urban: number; highway: number };
  };
  /** faixa de giro econômica (rpm) */
  ecoRpm: { min: number; max: number };
}

export const CRONOS_1_3_2022: VehicleSpec = {
  name: "Fiat Cronos Drive 1.3",
  year: 2022,
  engine: "1.3 Firefly Flex",
  displacementCc: 1332,
  cylinders: 4,
  valves: 8,
  powerCvEthanol: 109,
  powerCvGasoline: 101,
  powerRpm: 6250,
  torqueKgfmEthanol: 14.2,
  torqueKgfmGasoline: 13.7,
  torqueRpm: 3500,
  zeroTo100S: 11.5,
  topSpeedKmh: 183,
  gearbox: "Manual de 5 marchas",
  traction: "Dianteira",
  steering: "Assistência elétrica",
  suspensionFront: "Independente McPherson com mola helicoidal",
  suspensionRear: "Eixo de torção com mola helicoidal",
  brakesFront: "Discos ventilados",
  brakesRear: "Tambor",
  brakeSystem: "Hidráulico com ABS e ESC",
  lengthMm: 4364,
  widthMm: 1726,
  heightMm: 1508,
  wheelbaseMm: 2521,
  groundClearanceMm: 158,
  curbWeightKg: 1139,
  payloadKg: 400,
  trunkL: 525,
  tankL: 48,
  wheels: '6" x 15"',
  tires: "185/60 R15",
  consumption: {
    etanol: { urban: 9.1, highway: 11.2 },
    gasolina: { urban: 13.0, highway: 15.9 },
  },
  ecoRpm: { min: 1500, max: 2500 },
};

/** Perfil ativo do app (hoje um único veículo). */
export const ACTIVE_SPEC = CRONOS_1_3_2022;

/**
 * Aceleração máxima "de fábrica": 100 km/h em 11,5 s ≈ 8,7 km/h/s.
 * Passar disso só acontece com abuso de embreagem/giro.
 */
export function referenceAccelKmhPerS(spec: VehicleSpec = ACTIVE_SPEC) {
  return 100 / spec.zeroTo100S;
}

function fuelRange(spec: VehicleSpec, fuel: FuelKind) {
  if (fuel === "etanol") return spec.consumption.etanol;
  if (fuel === "gasolina") return spec.consumption.gasolina;
  return {
    urban: (spec.consumption.etanol.urban + spec.consumption.gasolina.urban) / 2,
    highway: (spec.consumption.etanol.highway + spec.consumption.gasolina.highway) / 2,
  };
}

/**
 * Consumo esperado (km/l) para a velocidade média da viagem, interpolando
 * entre o ciclo urbano (<=40 km/h) e o rodoviário (>=80 km/h) do Inmetro.
 */
export function expectedKmpl({
  fuel = "misto",
  avgSpeedKmh,
  spec = ACTIVE_SPEC,
}: {
  fuel?: FuelKind;
  avgSpeedKmh?: number | null;
  spec?: VehicleSpec;
}): number {
  const { urban, highway } = fuelRange(spec, fuel);
  const v = Number(avgSpeedKmh);
  if (!Number.isFinite(v)) return (urban + highway) / 2;
  const f = Math.max(0, Math.min(1, (v - 40) / 40));
  return urban + (highway - urban) * f;
}

export function fuelLabel(fuel: FuelKind) {
  return fuel === "etanol" ? "Etanol" : fuel === "gasolina" ? "Gasolina" : "Misto (E/G)";
}
