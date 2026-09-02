/**
 * Planos de assinatura do Telemetrix.
 * Módulo puro: nomes, preços e limites de cada plano.
 */

import type { AccountMode } from "@/lib/account/mode";

export type PlanId = "free" | "pro" | "frota";

export interface PlanLimits {
  /** Quantos veículos podem ser cadastrados. `Infinity` = sem limite. */
  maxVehicles: number;
  /** Dias de histórico de viagens visíveis. `Infinity` = completo. */
  historyDays: number;
  /** Relatórios semanais/mensais e tendências. */
  reports: boolean;
  /** Coach de direção com IA. */
  aiCoach: boolean;
  /** Rotinas/automação por cerca virtual. */
  automations: boolean;
  /** Compartilhar rastreamento com observadores. */
  sharing: boolean;
  /** Gestão de motoristas e ranking de equipe. */
  fleet: boolean;
  /** Alunos ativos por escola (Instrutor/Autoescola). `Infinity` = sem limite. */
  maxStudents: number;
  /** Instrutores convidados além do dono (Autoescola). 0 = só o dono. */
  maxInstructors: number;
  /** Corridas lançadas por mês (Motorista de app). `Infinity` = sem limite. */
  ridesPerMonth: number;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  tagline: string;
  /** Preço mensal em BRL (0 = grátis). */
  priceMonthly: number;
  highlight?: boolean;
  features: string[];
  limits: PlanLimits;
  /** Exemplo de uso do plano em cada perfil de conta. */
  examples: Record<AccountMode, string>;
}

const INF = Number.POSITIVE_INFINITY;

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Para conhecer o app no dia a dia",
    priceMonthly: 0,
    features: [
      "1 veículo",
      "Telemetria ao vivo (OBD-II ou rastreador)",
      "Histórico de 7 dias de viagens",
      "Eco Score e partida segura",
      "Até 40 corridas por mês · até 5 alunos",
    ],
    limits: {
      maxVehicles: 1,
      historyDays: 7,
      reports: false,
      aiCoach: false,
      automations: false,
      sharing: false,
      fleet: false,
      maxStudents: 5,
      maxInstructors: 0,
      ridesPerMonth: 40,
    },
    examples: {
      motorista: "Acompanhe o seu carro no dia a dia com telemetria e Eco Score.",
      app: "Experimente lançar corridas e ver o lucro do dia (até 40 corridas por mês).",
      instrutor: "Comece com até 5 alunos e a agenda de aulas no seu carro.",
      autoescola: "Teste com 1 carro e até 5 alunos, sem convidar instrutores.",
    },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quem usa o carro todos os dias",
    priceMonthly: 19.9,
    highlight: true,
    features: [
      "Até 5 veículos",
      "Histórico completo de viagens",
      "Relatórios semanais e tendências",
      "Coach de direção com IA",
      "Rotinas por cerca virtual",
      "Compartilhar rastreamento",
      "Corridas ilimitadas · até 30 alunos · 2 instrutores",
    ],
    limits: {
      maxVehicles: 5,
      historyDays: INF,
      reports: true,
      aiCoach: true,
      automations: true,
      sharing: true,
      fleet: false,
      maxStudents: 30,
      maxInstructors: 2,
      ridesPerMonth: INF,
    },
    examples: {
      motorista: "Histórico completo, coach de direção e rotinas por cerca virtual.",
      app: "Corridas ilimitadas, relatório semanal seg–dom e manutenção por rodagem alta.",
      instrutor: "Até 30 alunos, evolução por aula e histórico completo dos trajetos.",
      autoescola: "Até 5 carros, 2 instrutores convidados e 30 alunos em uma escola pequena.",
    },
  },
  {
    id: "frota",
    name: "Frota",
    tagline: "Para equipes e veículos compartilhados",
    priceMonthly: 49.9,
    features: [
      "Veículos ilimitados",
      "Tudo do Pro",
      "Motoristas com perfil e ranking",
      "Despesas e documentos por veículo",
      "Alertas de segurança para observadores",
      "Alunos e instrutores ilimitados",
    ],
    limits: {
      maxVehicles: INF,
      historyDays: INF,
      reports: true,
      aiCoach: true,
      automations: true,
      sharing: true,
      fleet: true,
      maxStudents: INF,
      maxInstructors: INF,
      ridesPerMonth: INF,
    },
    examples: {
      motorista: "Vários carros da família com motoristas, ranking e documentos por veículo.",
      app: "Mais de um carro na praça, motoristas parceiros e ranking de direção.",
      instrutor: "Mais de um carro de aula e alunos sem limite.",
      autoescola: "Frota completa, instrutores e alunos ilimitados, visão do dono por carro e instrutor.",
    },
  },
];

export const PLAN_BY_ID: Record<PlanId, PlanInfo> = {
  free: PLANS[0],
  pro: PLANS[1],
  frota: PLANS[2],
};

export function limitsFor(plan: PlanId): PlanLimits {
  return (PLAN_BY_ID[plan] ?? PLAN_BY_ID.free).limits;
}

export function parsePlanId(value: string | null | undefined): PlanId {
  return value === "pro" || value === "frota" ? value : "free";
}

/** Rótulo curto do preço, ex.: "Grátis" ou "R$ 19,90/mês". */
export function priceLabel(plan: PlanInfo): string {
  if (plan.priceMonthly <= 0) return "Grátis";
  return `${plan.priceMonthly.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}/mês`;
}

/** Rótulo de um limite numérico: "5", "Ilimitados" ou "—" quando zero. */
export function limitLabel(n: number, unlimited = "Ilimitados"): string {
  if (!Number.isFinite(n)) return unlimited;
  if (n <= 0) return "—";
  return String(n);
}

export interface LimitStatus {
  used: number;
  max: number;
  /** Já atingiu ou ultrapassou o limite. */
  atLimit: boolean;
  /** Quantos ainda cabem (Infinity quando sem limite). */
  remaining: number;
}

/** Situação de uso frente a um limite numérico do plano. */
export function limitStatus(used: number, max: number): LimitStatus {
  const safeUsed = Math.max(0, used);
  return {
    used: safeUsed,
    max,
    atLimit: Number.isFinite(max) && safeUsed >= max,
    remaining: Number.isFinite(max) ? Math.max(0, max - safeUsed) : INF,
  };
}

/** Quantidade de registros com `occurred_at` dentro do mês civil de `now`. */
export function countInMonth(items: { occurred_at: string }[], now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  let n = 0;
  for (const it of items) {
    const t = new Date(it.occurred_at).getTime();
    if (t >= start && t < end) n++;
  }
  return n;
}

/** Limites que fazem sentido mostrar para cada perfil de conta. */
export function limitsForMode(mode: AccountMode): (keyof PlanLimits)[] {
  switch (mode) {
    case "app":
      return ["maxVehicles", "ridesPerMonth", "historyDays"];
    case "instrutor":
      return ["maxVehicles", "maxStudents", "historyDays"];
    case "autoescola":
      return ["maxVehicles", "maxInstructors", "maxStudents"];
    default:
      return ["maxVehicles", "historyDays"];
  }
}

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  maxVehicles: "Veículos",
  historyDays: "Histórico de viagens",
  reports: "Relatórios e tendências",
  aiCoach: "Coach de direção com IA",
  automations: "Rotinas por cerca virtual",
  sharing: "Compartilhar rastreamento",
  fleet: "Motoristas e ranking",
  maxStudents: "Alunos ativos",
  maxInstructors: "Instrutores convidados",
  ridesPerMonth: "Corridas por mês",
};

/** Texto amigável de um valor de limite para tabelas comparativas. */
export function limitValueLabel(key: keyof PlanLimits, limits: PlanLimits): string | boolean {
  const v = limits[key];
  if (typeof v === "boolean") return v;
  if (key === "historyDays") return Number.isFinite(v) ? `${v} dias` : "Completo";
  if (key === "ridesPerMonth") return Number.isFinite(v) ? `${v}/mês` : "Ilimitadas";
  if (key === "maxStudents") return limitLabel(v);
  if (key === "maxInstructors") return Number.isFinite(v) ? (v === 0 ? "Só o dono" : String(v)) : "Ilimitados";
  return limitLabel(v);
}
