import {
  Car,
  CircleDollarSign,
  Droplets,
  Landmark,
  ParkingCircle,
  ReceiptText,
  ShieldCheck,
  TrafficCone,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ExpenseCategory =
  | "pedagio"
  | "estacionamento"
  | "lavagem"
  | "multa"
  | "seguro"
  | "manutencao"
  | "financiamento"
  | "acessorio"
  | "outro";

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  title: string | null;
  expense_date: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  place: string | null;
  notes: string | null;
  file_path: string | null;
  driver_id: string | null;
}

export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  Icon: LucideIcon;
  color: string;
}[] = [
  { value: "pedagio", label: "Pedágio", Icon: TrafficCone, color: "hsl(var(--chart-1))" },
  { value: "estacionamento", label: "Estacionamento", Icon: ParkingCircle, color: "hsl(var(--chart-2))" },
  { value: "lavagem", label: "Lavagem", Icon: Droplets, color: "hsl(var(--chart-3))" },
  { value: "multa", label: "Multa", Icon: ReceiptText, color: "hsl(var(--destructive))" },
  { value: "seguro", label: "Seguro", Icon: ShieldCheck, color: "hsl(var(--chart-4))" },
  { value: "manutencao", label: "Manutenção", Icon: Wrench, color: "hsl(var(--chart-5))" },
  { value: "financiamento", label: "Financiamento", Icon: Landmark, color: "hsl(var(--primary))" },
  { value: "acessorio", label: "Acessório", Icon: Car, color: "hsl(var(--muted-foreground))" },
  { value: "outro", label: "Outro", Icon: CircleDollarSign, color: "hsl(var(--muted-foreground))" },
];

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = EXPENSE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<ExpenseCategory, string>,
);

export const EXPENSE_COLOR: Record<ExpenseCategory, string> = EXPENSE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.color }),
  {} as Record<ExpenseCategory, string>,
);

export function expenseIcon(category: ExpenseCategory): LucideIcon {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.Icon ?? CircleDollarSign;
}

/** "2026-07" para a data informada (fuso local). */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function monthRange(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

export function previousMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";"),
    )
    .join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
