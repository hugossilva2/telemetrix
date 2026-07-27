export type ExpiryStatus = "ok" | "soon" | "expired" | "none";

export const SOON_DAYS = 30;

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function expiryStatus(dateStr?: string | null): ExpiryStatus {
  const d = daysUntil(dateStr);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= SOON_DAYS) return "soon";
  return "ok";
}

export const expiryClasses: Record<ExpiryStatus, string> = {
  ok: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
  soon: "bg-amber-500/10 text-amber-500 border-amber-500/25",
  expired: "bg-destructive/10 text-destructive border-destructive/25",
  none: "bg-muted text-muted-foreground border-border",
};

export function expiryLabel(dateStr?: string | null): string {
  const d = daysUntil(dateStr);
  if (d === null) return "Sem data";
  if (d < 0) return `Vencido há ${Math.abs(d)} dia(s)`;
  if (d === 0) return "Vence hoje";
  return `Faltam ${d} dia(s)`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
