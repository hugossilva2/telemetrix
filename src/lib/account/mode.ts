/**
 * Perfis de uso da conta (modo). Módulo puro: rótulos, descrições e
 * o que cada modo destaca no app.
 */

export type AccountMode = "motorista" | "app" | "instrutor" | "autoescola";

export const ACCOUNT_MODES: AccountMode[] = ["motorista", "app", "instrutor", "autoescola"];

export interface AccountModeInfo {
  id: AccountMode;
  label: string;
  /** Frase curta usada no seletor. */
  tagline: string;
  /** O que o app passa a destacar nesse modo. */
  highlights: string[];
  /** Subtítulo do painel inicial. */
  dashboardSubtitle: string;
  /** Slug da página pública correspondente (casos de uso). */
  useCaseSlug: "motorista" | "motorista-de-app" | "instrutor" | "autoescola";
  /** Recursos que ainda chegam nas próximas fases (mostrados como "em breve"). */
  upcoming: string[];
}

export const ACCOUNT_MODE_INFO: Record<AccountMode, AccountModeInfo> = {
  motorista: {
    id: "motorista",
    label: "Motorista",
    tagline: "Uso pessoal: controle do meu carro",
    highlights: ["Telemetria ao vivo", "Viagens com custo", "Manutenção e documentos"],
    dashboardSubtitle: "Telemetria em tempo real",
    useCaseSlug: "motorista",
    upcoming: [],
  },
  app: {
    id: "app",
    label: "Motorista de app",
    tagline: "Uber, 99 e similares: ganhos x gastos",
    highlights: ["Lucro por km e por hora", "Corridas e turnos", "Manutenção por rodagem alta"],
    dashboardSubtitle: "Seu carro é sua ferramenta de trabalho",
    useCaseSlug: "motorista-de-app",
    upcoming: ["Corridas e turnos", "Painel Meu lucro", "Relatório semanal seg–dom"],
  },
  instrutor: {
    id: "instrutor",
    label: "Instrutor autônomo",
    tagline: "Um carro, você e seus alunos",
    highlights: ["Alunos e agenda", "Aula vira trajeto avaliado", "Cobrança por aula"],
    dashboardSubtitle: "Aulas e alunos no seu carro",
    useCaseSlug: "instrutor",
    upcoming: ["Cadastro de alunos", "Agenda de aulas", "Aula vinculada à viagem"],
  },
  autoescola: {
    id: "autoescola",
    label: "Autoescola",
    tagline: "Vários carros, instrutores e alunos",
    highlights: ["Equipe de instrutores", "Agenda geral", "Custo por aula e por carro"],
    dashboardSubtitle: "Visão da autoescola",
    useCaseSlug: "autoescola",
    upcoming: ["Convite de instrutores", "Agenda geral", "Visão do dono"],
  },
};

export function parseAccountMode(value: string | null | undefined): AccountMode {
  return value === "app" || value === "instrutor" || value === "autoescola"
    ? value
    : "motorista";
}

/** Modos de ensino compartilham a estrutura de "escola". */
export function isTeachingMode(mode: AccountMode): boolean {
  return mode === "instrutor" || mode === "autoescola";
}
