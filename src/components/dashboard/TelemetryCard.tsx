import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  Icon: LucideIcon;
  accent?: "primary" | "emerald" | "sky" | "amber";
  children?: ReactNode;
  className?: string;
}

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/15 text-primary",
  emerald: "bg-emerald-500/15 text-emerald-500",
  sky: "bg-sky-500/15 text-sky-500",
  amber: "bg-amber-500/15 text-amber-500",
};

export function TelemetryCard({ label, value, Icon, accent = "primary", children, className = "" }: Props) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 transition-opacity ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`grid size-8 place-items-center rounded-full ${accentBg[accent]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
