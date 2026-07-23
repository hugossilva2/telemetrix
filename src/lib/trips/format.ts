export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatDurationBetween(startIso: string, endIso: string | null): string {
  if (!endIso) return "em andamento";
  const s = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000;
  return formatDurationSeconds(s);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
