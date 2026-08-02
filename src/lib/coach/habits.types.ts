/** Tipos do relatório de recomendações automáticas de condução (client-safe). */
import type { CoachGrade } from "@/lib/coach/types";

export type RecommendationPriority = "alta" | "media" | "baixa";

export interface DrivingRecommendation {
  title: string;
  detail: string;
  impact: string | null;
  priority: RecommendationPriority;
}

export interface HabitsStats {
  trips: number;
  totalKm: number;
  avgEcoScore: number | null;
  avgKmpl: number | null;
  idleMinutes: number;
  wastedCost: number;
  worstEvent: string | null;
}

export interface HabitsAnalysis {
  grade: CoachGrade;
  headline: string;
  summary: string;
  recommendations: DrivingRecommendation[];
  strength: string | null;
  focus: string | null;
  savingsEstimate: string | null;
  stats: HabitsStats;
  model: string;
  createdAt: string;
}

export const PRIORITY_LABEL: Record<RecommendationPriority, string> = {
  alta: "Prioridade alta",
  media: "Prioridade média",
  baixa: "Ajuste fino",
};

export const PRIORITY_CLASS: Record<RecommendationPriority, string> = {
  alta: "text-destructive border-destructive/40 bg-destructive/10",
  media: "text-warning border-warning/40 bg-warning/10",
  baixa: "text-primary border-primary/40 bg-primary/10",
};

export const EVENT_LABEL_PT: Record<string, string> = {
  harsh_brake: "Freada brusca",
  harsh_accel: "Aceleração agressiva",
  harsh_corner: "Curva acentuada",
  overspeed: "Excesso de velocidade",
  high_rpm: "Giro alto",
};
