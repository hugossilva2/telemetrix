/**
 * `defaultKm` é o intervalo de uso pessoal; `heavyKm` é o intervalo para
 * rodagem alta (motorista de app), em que o carro roda muito mais por mês.
 */
export const MAINTENANCE_TYPES = [
  { value: "oleo", label: "Troca de óleo", defaultKm: 10000, heavyKm: 5000, defaultMonths: 12 },
  { value: "filtro_oleo", label: "Filtro de óleo", defaultKm: 10000, heavyKm: 5000, defaultMonths: 12 },
  { value: "filtro_ar", label: "Filtro de ar", defaultKm: 15000, heavyKm: 10000, defaultMonths: 12 },
  { value: "filtro_combustivel", label: "Filtro de combustível", defaultKm: 20000, heavyKm: 15000, defaultMonths: 24 },
  { value: "correia", label: "Correia dentada", defaultKm: 60000, heavyKm: 50000, defaultMonths: 48 },
  { value: "pneus", label: "Rodízio de pneus", defaultKm: 10000, heavyKm: 5000, defaultMonths: 12 },
  { value: "freios", label: "Freios / pastilhas", defaultKm: 30000, heavyKm: 20000, defaultMonths: 24 },
  { value: "velas", label: "Velas de ignição", defaultKm: 40000, heavyKm: 30000, defaultMonths: 36 },
  { value: "revisao", label: "Revisão geral", defaultKm: 10000, heavyKm: 5000, defaultMonths: 12 },
  { value: "outro", label: "Outro", defaultKm: null, heavyKm: null, defaultMonths: null },
] as const;

/** Intervalo padrão em km para o tipo, conforme o regime de uso. */
export function defaultIntervalKm(type: string, heavyUse: boolean): number | null {
  const t = MAINTENANCE_TYPES.find((x) => x.value === type);
  if (!t) return null;
  return heavyUse ? t.heavyKm : t.defaultKm;
}

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]["value"];

export const MAINTENANCE_LABEL: Record<string, string> = Object.fromEntries(
  MAINTENANCE_TYPES.map((t) => [t.value, t.label]),
);

/** Km restantes a partir do qual o alerta fica amarelo. */
export const WARN_KM = 500;
const DEFAULT_WARN_KM = WARN_KM;
/** Rodagem alta: avisa com mais antecedência (uma semana de trabalho ≈ 1.000 km). */
export const HEAVY_WARN_KM = 1000;
/** Dias restantes a partir do qual o alerta fica amarelo. */
export const WARN_DAYS = 30;

export type MaintenanceStatus = "ok" | "soon" | "overdue" | "unknown";

export interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  title: string | null;
  service_date: string;
  mileage_at_service: number;
  interval_km: number | null;
  interval_months: number | null;
  cost: number | null;
  workshop: string | null;
  notes: string | null;
  file_path: string | null;
}

export interface MaintenanceStatusInfo {
  status: MaintenanceStatus;
  remainingKm: number | null;
  remainingDays: number | null;
  nextKm: number | null;
  nextDate: string | null;
  message: string;
}

function addMonths(dateStr: string, months: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

function daysBetweenToday(dt: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dt.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Calcula o status da próxima manutenção com base no odômetro atual
 * (vindo da telemetria) e/ou no intervalo em meses.
 */
export function computeStatus(
  record: MaintenanceRecord,
  currentMileageKm: number | null | undefined,
  opts: { warnKm?: number } = {},
): MaintenanceStatusInfo {
  const WARN_KM = opts.warnKm ?? DEFAULT_WARN_KM;
  let remainingKm: number | null = null;
  let nextKm: number | null = null;
  if (record.interval_km != null && record.interval_km > 0) {
    nextKm = Number(record.mileage_at_service) + Number(record.interval_km);
    if (typeof currentMileageKm === "number" && Number.isFinite(currentMileageKm)) {
      remainingKm = nextKm - currentMileageKm;
    }
  }

  let remainingDays: number | null = null;
  let nextDate: string | null = null;
  if (record.interval_months != null && record.interval_months > 0) {
    const dt = addMonths(record.service_date, record.interval_months);
    nextDate = dt.toISOString().slice(0, 10);
    remainingDays = daysBetweenToday(dt);
  }

  const overdue =
    (remainingKm != null && remainingKm <= 0) || (remainingDays != null && remainingDays <= 0);
  const soon =
    (remainingKm != null && remainingKm <= WARN_KM) ||
    (remainingDays != null && remainingDays <= WARN_DAYS);

  let status: MaintenanceStatus = "unknown";
  if (overdue) status = "overdue";
  else if (soon) status = "soon";
  else if (remainingKm != null || remainingDays != null) status = "ok";

  let message: string;
  if (status === "unknown") {
    message = "Sem intervalo definido";
  } else if (overdue) {
    if (remainingKm != null && remainingKm <= 0) {
      message = `Vencido há ${Math.abs(Math.round(remainingKm)).toLocaleString("pt-BR")} km`;
    } else {
      message = `Vencido há ${Math.abs(remainingDays ?? 0)} dia(s)`;
    }
  } else if (remainingKm != null && (remainingDays == null || remainingKm <= WARN_KM)) {
    message = `Faltam ${Math.round(remainingKm).toLocaleString("pt-BR")} km`;
  } else if (remainingDays != null) {
    message = `Faltam ${remainingDays} dia(s)`;
  } else {
    message = "Em dia";
  }

  return { status, remainingKm, remainingDays, nextKm, nextDate, message };
}

export const maintenanceClasses: Record<MaintenanceStatus, string> = {
  ok: "bg-success/10 text-success border-success/25",
  soon: "bg-warning/10 text-warning border-warning/25",
  overdue: "bg-destructive/10 text-destructive border-destructive/25",
  unknown: "bg-muted text-muted-foreground border-border",
};

/**
 * Mantém apenas o registro mais recente (maior odômetro / data) de cada tipo,
 * que é o que define a próxima manutenção.
 */
export function latestByType(records: MaintenanceRecord[]): MaintenanceRecord[] {
  const map = new Map<string, MaintenanceRecord>();
  for (const r of records) {
    const cur = map.get(r.type);
    if (
      !cur ||
      Number(r.mileage_at_service) > Number(cur.mileage_at_service) ||
      (Number(r.mileage_at_service) === Number(cur.mileage_at_service) &&
        r.service_date > cur.service_date)
    ) {
      map.set(r.type, r);
    }
  }
  return Array.from(map.values());
}

/**
 * Dias estimados até vencer pelos km, dado o ritmo semanal de rodagem.
 * Retorna null sem ritmo ou sem km restantes.
 */
export function daysUntilAtPace(remainingKm: number | null, kmPerWeek: number | null): number | null {
  if (remainingKm == null || kmPerWeek == null || !(kmPerWeek > 0)) return null;
  if (remainingKm <= 0) return 0;
  return Math.round((remainingKm / kmPerWeek) * 7);
}
