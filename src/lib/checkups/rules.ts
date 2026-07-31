import {
  Droplets,
  Lightbulb,
  Sparkles,
  Thermometer,
  CircleDot,
  SprayCan,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CheckupItem =
  | "oleo"
  | "arrefecimento"
  | "pneus"
  | "farois"
  | "agua_limpador"
  | "lavagem";

export type CheckupPeriod = "semanal" | "mensal";

export interface CheckupDef {
  value: CheckupItem;
  label: string;
  hint: string;
  period: CheckupPeriod;
  periodDays: number;
  Icon: LucideIcon;
}

export const CHECKUPS: CheckupDef[] = [
  {
    value: "oleo",
    label: "Nível de óleo",
    hint: "Motor frio, no nível entre mín. e máx.",
    period: "semanal",
    periodDays: 7,
    Icon: Droplets,
  },
  {
    value: "arrefecimento",
    label: "Arrefecimento",
    hint: "Reservatório de água/aditivo do radiador.",
    period: "semanal",
    periodDays: 7,
    Icon: Thermometer,
  },
  {
    value: "pneus",
    label: "Pneus",
    hint: "Pressão e desgaste das bandas.",
    period: "semanal",
    periodDays: 7,
    Icon: CircleDot,
  },
  {
    value: "farois",
    label: "Faróis e lanternas",
    hint: "Baixa, alta, setas, freio e ré.",
    period: "mensal",
    periodDays: 30,
    Icon: Lightbulb,
  },
  {
    value: "agua_limpador",
    label: "Água do limpador",
    hint: "Reservatório do esguicho e palhetas.",
    period: "mensal",
    periodDays: 30,
    Icon: SprayCan,
  },
  {
    value: "lavagem",
    label: "Lavagem",
    hint: "Higienização externa e interna.",
    period: "mensal",
    periodDays: 30,
    Icon: Sparkles,
  },
];

export const CHECKUP_LABEL: Record<string, string> = Object.fromEntries(
  CHECKUPS.map((c) => [c.value, c.label]),
);

export function checkupDef(item: string): CheckupDef | undefined {
  return CHECKUPS.find((c) => c.value === item);
}

export interface CheckupRecord {
  id: string;
  item: string;
  checked_at: string;
  mileage_km: number | null;
  notes: string | null;
}

export type CheckupStatus = "ok" | "soon" | "pending";

export interface CheckupStatusInfo {
  status: CheckupStatus;
  lastAt: string | null;
  daysSince: number | null;
  daysLeft: number | null;
  message: string;
}

export const checkupClasses: Record<CheckupStatus, string> = {
  ok: "bg-success/10 text-success border-success/25",
  soon: "bg-warning/10 text-warning border-warning/25",
  pending: "bg-destructive/10 text-destructive border-destructive/25",
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Último registro de cada rotina (mais recente). */
export function latestByItem(records: CheckupRecord[]): Map<string, CheckupRecord> {
  const map = new Map<string, CheckupRecord>();
  for (const r of records) {
    const cur = map.get(r.item);
    if (!cur || r.checked_at > cur.checked_at) map.set(r.item, r);
  }
  return map;
}

/**
 * Status de uma rotina: verde em dia, amarelo nos últimos 20% do período,
 * vermelho (pendente) quando passa do período ou nunca foi conferida.
 */
export function checkupStatus(def: CheckupDef, last?: CheckupRecord): CheckupStatusInfo {
  if (!last) {
    return {
      status: "pending",
      lastAt: null,
      daysSince: null,
      daysLeft: null,
      message: "Nunca conferido",
    };
  }
  const since = daysSince(last.checked_at);
  const left = def.periodDays - since;
  const warnFrom = Math.max(1, Math.round(def.periodDays * 0.2));

  let status: CheckupStatus = "ok";
  if (left <= 0) status = "pending";
  else if (left <= warnFrom) status = "soon";

  let message: string;
  if (status === "pending") {
    message = `Pendente há ${Math.abs(left)} dia(s)`;
  } else if (since === 0) {
    message = "Conferido hoje";
  } else {
    message = `Há ${since} dia(s)`;
  }

  return { status, lastAt: last.checked_at, daysSince: since, daysLeft: left, message };
}

export interface CheckupSummaryEntry {
  def: CheckupDef;
  last?: CheckupRecord;
  info: CheckupStatusInfo;
}

export function summarizeCheckups(records: CheckupRecord[]): CheckupSummaryEntry[] {
  const latest = latestByItem(records);
  const rank: Record<CheckupStatus, number> = { pending: 0, soon: 1, ok: 2 };
  return CHECKUPS.map((def) => {
    const last = latest.get(def.value);
    return { def, last, info: checkupStatus(def, last) };
  }).sort((a, b) => rank[a.info.status] - rank[b.info.status]);
}

export interface HealthInput {
  checkups: CheckupSummaryEntry[];
  maintenanceSoon: number;
  maintenanceOverdue: number;
  docsExpired: number;
}

export interface HealthResult {
  score: number;
  label: string;
  color: string;
  stroke: string;
}

/** Saúde 0-100: parte de 100 e desconta pendências. */
export function vehicleHealth(input: HealthInput): HealthResult {
  const pending = input.checkups.filter((c) => c.info.status === "pending").length;
  const soon = input.checkups.filter((c) => c.info.status === "soon").length;

  let score = 100;
  score -= pending * 10;
  score -= soon * 4;
  score -= input.maintenanceSoon * 6;
  score -= input.maintenanceOverdue * 12;
  score -= input.docsExpired * 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 85) return { score, label: "Excelente", color: "text-success", stroke: "var(--success)" };
  if (score >= 65) return { score, label: "Boa", color: "text-primary", stroke: "var(--primary)" };
  if (score >= 45)
    return { score, label: "Atenção", color: "text-warning", stroke: "var(--warning)" };
  return { score, label: "Crítica", color: "text-destructive", stroke: "var(--destructive)" };
}
