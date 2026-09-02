/**
 * Cálculo de lucro do motorista de app (módulo puro).
 * lucro = ganhos (corridas + gorjetas) − combustível − despesas.
 * R$/km usa os km das corridas (ou dos turnos, se houver odômetro);
 * R$/h usa as horas de turno (ou a soma das durações das corridas).
 */

export type RidePlatform = "uber" | "99" | "indrive" | "outra";

export const RIDE_PLATFORMS: { value: RidePlatform; label: string }[] = [
  { value: "uber", label: "Uber" },
  { value: "99", label: "99" },
  { value: "indrive", label: "inDrive" },
  { value: "outra", label: "Outra" },
];

export function platformLabel(p: string): string {
  return RIDE_PLATFORMS.find((x) => x.value === p)?.label ?? "Outra";
}

export interface RidePoint {
  occurred_at: string;
  platform: string;
  amount: number;
  tip: number;
  distance_km: number | null;
  duration_min: number | null;
}

export interface ShiftPoint {
  started_at: string;
  ended_at: string | null;
  start_mileage: number | null;
  end_mileage: number | null;
}

export interface CostPoint {
  date: string;
  amount: number;
}

export interface Period {
  start: Date;
  /** Exclusivo. */
  end: Date;
}

export interface ProfitSummary {
  rides: number;
  earnings: number;
  tips: number;
  fuelCost: number;
  otherCost: number;
  profit: number;
  km: number;
  hours: number;
  profitPerKm: number | null;
  profitPerHour: number | null;
  earningsPerRide: number | null;
  byPlatform: { platform: string; earnings: number; rides: number }[];
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function inPeriod(iso: string, p: Period): boolean {
  const t = new Date(iso).getTime();
  return t >= p.start.getTime() && t < p.end.getTime();
}

/** Horas de turno dentro do período (turno aberto conta até `now`). */
export function shiftHours(shifts: ShiftPoint[], p: Period, now = new Date()): number {
  let ms = 0;
  for (const s of shifts) {
    const a = Math.max(new Date(s.started_at).getTime(), p.start.getTime());
    const b = Math.min(
      s.ended_at ? new Date(s.ended_at).getTime() : now.getTime(),
      p.end.getTime(),
    );
    if (b > a) ms += b - a;
  }
  return ms / 3_600_000;
}

/** Km dos turnos encerrados que começaram no período (odômetro fim − início). */
export function shiftKm(shifts: ShiftPoint[], p: Period): number {
  let km = 0;
  for (const s of shifts) {
    if (!inPeriod(s.started_at, p)) continue;
    const d = n(s.end_mileage) - n(s.start_mileage);
    if (s.start_mileage != null && s.end_mileage != null && d > 0 && d < 2000) km += d;
  }
  return km;
}

export function profitSummary(
  input: {
    rides: RidePoint[];
    shifts: ShiftPoint[];
    fuel: CostPoint[];
    expenses: CostPoint[];
  },
  p: Period,
  now = new Date(),
): ProfitSummary {
  const rides = input.rides.filter((r) => inPeriod(r.occurred_at, p));
  const fuelCost = input.fuel.filter((c) => inPeriod(c.date, p)).reduce((s, c) => s + n(c.amount), 0);
  const otherCost = input.expenses
    .filter((c) => inPeriod(c.date, p))
    .reduce((s, c) => s + n(c.amount), 0);

  let earnings = 0;
  let tips = 0;
  let rideKm = 0;
  let rideMin = 0;
  const byMap = new Map<string, { earnings: number; rides: number }>();
  for (const r of rides) {
    const total = n(r.amount) + n(r.tip);
    earnings += total;
    tips += n(r.tip);
    rideKm += n(r.distance_km);
    rideMin += n(r.duration_min);
    const cur = byMap.get(r.platform) ?? { earnings: 0, rides: 0 };
    cur.earnings += total;
    cur.rides += 1;
    byMap.set(r.platform, cur);
  }

  const kmFromShifts = shiftKm(input.shifts, p);
  const km = Math.max(rideKm, kmFromShifts);
  const hoursFromShifts = shiftHours(input.shifts, p, now);
  const hours = hoursFromShifts > 0 ? hoursFromShifts : rideMin / 60;

  const profit = earnings - fuelCost - otherCost;
  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    rides: rides.length,
    earnings: round2(earnings),
    tips: round2(tips),
    fuelCost: round2(fuelCost),
    otherCost: round2(otherCost),
    profit: round2(profit),
    km: round2(km),
    hours: round2(hours),
    profitPerKm: km > 0 ? round2(profit / km) : null,
    profitPerHour: hours > 0 ? round2(profit / hours) : null,
    earningsPerRide: rides.length > 0 ? round2(earnings / rides.length) : null,
    byPlatform: [...byMap.entries()]
      .map(([platform, v]) => ({ platform, earnings: round2(v.earnings), rides: v.rides }))
      .sort((a, b) => b.earnings - a.earnings),
  };
}

/** Início do dia local. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Semana do motorista de app: segunda 00:00 → próxima segunda (padrão Uber). */
export function weekPeriod(ref = new Date()): Period {
  const start = startOfDay(ref);
  const dow = (start.getDay() + 6) % 7; // seg=0
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function dayPeriod(ref = new Date()): Period {
  const start = startOfDay(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function monthPeriod(ref = new Date()): Period {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

/** Totais por dia (seg–dom) para o gráfico semanal. */
export function dailyEarnings(rides: RidePoint[], p: Period): { label: string; value: number }[] {
  const days: { label: string; value: number }[] = [];
  const labels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  const cursor = new Date(p.start);
  let i = 0;
  while (cursor < p.end && i < 31) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    const value = rides
      .filter((r) => inPeriod(r.occurred_at, { start: cursor, end: next }))
      .reduce((s, r) => s + n(r.amount) + n(r.tip), 0);
    const label =
      p.end.getTime() - p.start.getTime() <= 8 * 86_400_000
        ? labels[(cursor.getDay() + 6) % 7]
        : String(cursor.getDate());
    days.push({ label, value: Math.round(value * 100) / 100 });
    cursor.setDate(cursor.getDate() + 1);
    i++;
  }
  return days;
}
