/**
 * Planos de assinatura do Telemetrix.
 * Módulo puro: nomes, preços e limites de cada plano.
 */

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
}

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
    ],
    limits: {
      maxVehicles: 1,
      historyDays: 7,
      reports: false,
      aiCoach: false,
      automations: false,
      sharing: false,
      fleet: false,
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
    ],
    limits: {
      maxVehicles: 5,
      historyDays: Number.POSITIVE_INFINITY,
      reports: true,
      aiCoach: true,
      automations: true,
      sharing: true,
      fleet: false,
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
    ],
    limits: {
      maxVehicles: Number.POSITIVE_INFINITY,
      historyDays: Number.POSITIVE_INFINITY,
      reports: true,
      aiCoach: true,
      automations: true,
      sharing: true,
      fleet: true,
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
