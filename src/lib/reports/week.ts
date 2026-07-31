/** Utilitários de semana (segunda a domingo) para o relatório semanal. */

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Segunda-feira da semana da data informada. */
export function weekStart(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 dom … 6 sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Chave "2026-07-27" (segunda-feira da semana). */
export function weekKey(date: Date | string): string {
  return fmt(weekStart(date));
}

export function weekRange(key: string): { start: string; end: string } {
  const start = weekStart(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: fmt(start), end: fmt(end) };
}

export function previousWeek(key: string): string {
  const d = weekStart(key);
  d.setDate(d.getDate() - 7);
  return fmt(d);
}

export function nextWeek(key: string): string {
  const d = weekStart(key);
  d.setDate(d.getDate() + 7);
  return fmt(d);
}

export function weekLabel(key: string): string {
  const { start, end } = weekRange(key);
  const f = (s: string) => {
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  return `${f(start)} – ${f(end)}`;
}

export function lastWeeks(n: number): string[] {
  const out: string[] = [];
  let cur = weekKey(new Date());
  for (let i = 0; i < n; i++) {
    out.push(cur);
    cur = previousWeek(cur);
  }
  return out;
}
