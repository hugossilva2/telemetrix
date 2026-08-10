/**
 * Estimativa do nível do tanque sem sensor de combustível: parte de uma
 * calibração informada pelo usuário (tanque cheio ou nível aproximado) e
 * desconta os km rodados desde então, somando os abastecimentos registrados.
 * Módulo puro (sem React).
 */

export interface FuelFill {
  /** ISO date do abastecimento. */
  date: string;
  liters: number;
  /** Odômetro no momento do abastecimento (quando informado). */
  odometerKm: number | null;
}

export interface TankAnchor {
  /** Litros no tanque no momento da calibração. */
  liters: number;
  /** Odômetro na calibração. */
  odometerKm: number;
  /** ISO date da calibração. */
  at: string;
}

export interface TankEstimate {
  liters: number;
  pct: number;
  kmSinceAnchor: number;
  litersAdded: number;
  kmpl: number;
}

/** Km/l histórico entre abastecimentos consecutivos (lista em ordem decrescente). */
export function historicalKmpl(fills: FuelFill[]): number | null {
  const values: number[] = [];
  for (let i = 0; i < fills.length - 1; i++) {
    const newer = fills[i];
    const older = fills[i + 1];
    if (newer.odometerKm == null || older.odometerKm == null) continue;
    const km = newer.odometerKm - older.odometerKm;
    if (!(km > 0) || !(newer.liters > 0)) continue;
    const kmpl = km / newer.liters;
    if (kmpl >= 4 && kmpl <= 30) values.push(kmpl);
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Litros abastecidos depois da calibração. */
export function litersAddedAfter(anchor: TankAnchor, fills: FuelFill[]): number {
  const anchorTime = Date.parse(anchor.at);
  return fills.reduce((sum, f) => {
    const t = Date.parse(f.date);
    const afterByOdometer =
      f.odometerKm != null && f.odometerKm > anchor.odometerKm + 0.5;
    const afterByDate = Number.isFinite(t) && Number.isFinite(anchorTime) && t > anchorTime;
    return sum + (afterByOdometer || afterByDate ? Number(f.liters) || 0 : 0);
  }, 0);
}

/**
 * Nível estimado do tanque agora. `null` quando falta calibração, odômetro
 * atual ou consumo válido.
 */
export function estimateTank({
  anchor,
  fills,
  odometerKm,
  kmpl,
  tankL,
}: {
  anchor: TankAnchor | null;
  fills: FuelFill[];
  odometerKm: number | null;
  kmpl: number | null;
  tankL: number;
}): TankEstimate | null {
  if (!anchor || odometerKm == null || !Number.isFinite(odometerKm)) return null;
  if (kmpl == null || !Number.isFinite(kmpl) || kmpl <= 0) return null;
  if (!Number.isFinite(tankL) || tankL <= 0) return null;

  const kmSinceAnchor = Math.max(0, odometerKm - anchor.odometerKm);
  const litersAdded = litersAddedAfter(anchor, fills);
  const consumed = kmSinceAnchor / kmpl;
  const liters = Math.max(0, Math.min(tankL, anchor.liters + litersAdded - consumed));

  return {
    liters,
    pct: (liters / tankL) * 100,
    kmSinceAnchor,
    litersAdded,
    kmpl,
  };
}
