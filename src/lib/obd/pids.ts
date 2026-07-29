/**
 * PIDs OBD-II (modo 01) usados pelo modo Econômico e seus decodificadores.
 * Cada decode recebe os bytes de dado (já sem o cabeçalho `41 XX`).
 */
export interface PidSpec {
  /** Comando enviado ao ELM327, ex.: "010C". */
  cmd: string;
  /** Byte do PID em hex maiúsculo, ex.: "0C". */
  pid: string;
  decode: (bytes: number[]) => number | undefined;
}

const u = (b: number | undefined) => (typeof b === "number" ? b : undefined);

export const PID_RPM: PidSpec = {
  cmd: "010C",
  pid: "0C",
  decode: (b) =>
    b.length >= 2 ? (b[0] * 256 + b[1]) / 4 : undefined,
};

export const PID_SPEED: PidSpec = {
  cmd: "010D",
  pid: "0D",
  decode: (b) => u(b[0]),
};

export const PID_COOLANT: PidSpec = {
  cmd: "0105",
  pid: "05",
  decode: (b) => (b.length >= 1 ? b[0] - 40 : undefined),
};

export const PID_FUEL_LEVEL: PidSpec = {
  cmd: "012F",
  pid: "2F",
  decode: (b) => (b.length >= 1 ? (b[0] * 100) / 255 : undefined),
};

export const PID_ENGINE_LOAD: PidSpec = {
  cmd: "0104",
  pid: "04",
  decode: (b) => (b.length >= 1 ? (b[0] * 100) / 255 : undefined),
};

export const PID_MAF: PidSpec = {
  cmd: "0110",
  pid: "10",
  decode: (b) => (b.length >= 2 ? (b[0] * 256 + b[1]) / 100 : undefined), // g/s
};

export const PID_CONTROL_VOLTAGE: PidSpec = {
  cmd: "0142",
  pid: "42",
  decode: (b) => (b.length >= 2 ? (b[0] * 256 + b[1]) / 1000 : undefined),
};

/** Ordem do polling: dados rápidos toda volta, lentos alternados. */
export const FAST_PIDS: PidSpec[] = [PID_RPM, PID_SPEED];
export const SLOW_PIDS: PidSpec[] = [
  PID_ENGINE_LOAD,
  PID_MAF,
  PID_FUEL_LEVEL,
  PID_COOLANT,
  PID_CONTROL_VOLTAGE,
];

/**
 * Converte a resposta textual do ELM327 em bytes de dado.
 * Aceita respostas com ou sem cabeçalho, multi-linha e com espaços.
 * Ex.: "41 0C 1A F8" com pid "0C" -> [0x1A, 0xF8]
 */
export function parsePidResponse(raw: string, pid: string): number[] | null {
  const clean = raw
    .replace(/[\r\n>]/g, " ")
    .replace(/SEARCHING\.*/gi, " ")
    .toUpperCase();
  if (/NO DATA|UNABLE|ERROR|STOPPED|\?/.test(clean)) return null;

  const tokens = clean.match(/[0-9A-F]{2}/g);
  if (!tokens) return null;

  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === "41" && tokens[i + 1] === pid) {
      return tokens.slice(i + 2).map((t) => parseInt(t, 16));
    }
  }
  return null;
}

/** Consumo instantâneo (L/h) a partir do MAF, assumindo gasolina (AFR 14.7). */
export function fuelRateLph(mafGramsPerSecond: number): number {
  const gasolineDensity = 745; // g/L
  return (mafGramsPerSecond * 3600) / (14.7 * gasolineDensity);
}
