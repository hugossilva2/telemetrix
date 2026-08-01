/** Tipos compartilhados do Coach de direção com IA (client-safe). */

export type CoachGrade = "otimo" | "bom" | "regular" | "pessimo";

export interface CoachTip {
  title: string;
  detail: string;
}

export interface TripCoaching {
  tripId: string;
  grade: CoachGrade;
  headline: string;
  summary: string;
  tips: CoachTip[];
  comparison: string | null;
  highlight: string | null;
  createdAt: string;
}

export const COACH_GRADE_LABEL: Record<CoachGrade, string> = {
  otimo: "Ótimo",
  bom: "Bom",
  regular: "Regular",
  pessimo: "Péssimo",
};

export const COACH_GRADE_CLASS: Record<CoachGrade, string> = {
  otimo: "text-primary border-primary/40 bg-primary/10",
  bom: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  regular: "text-warning border-warning/40 bg-warning/10",
  pessimo: "text-destructive border-destructive/40 bg-destructive/10",
};

export function normalizeGrade(value: unknown): CoachGrade {
  const v = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (v.startsWith("otim")) return "otimo";
  if (v.startsWith("bom") || v.startsWith("boa")) return "bom";
  if (v.startsWith("pessim")) return "pessimo";
  return "regular";
}

export function parseTips(value: unknown): CoachTip[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { title: item, detail: "" };
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const title = typeof rec["title"] === "string" ? rec["title"] : "";
        const detail = typeof rec["detail"] === "string" ? rec["detail"] : "";
        if (title || detail) return { title: title || detail, detail: title ? detail : "" };
      }
      return null;
    })
    .filter((t): t is CoachTip => t != null)
    .slice(0, 4);
}
