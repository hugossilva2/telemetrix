import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "warning" | "destructive" | "muted";
  className?: string;
}

const TONE: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/** Bloco de KPI para as grades bento. */
export function StatTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-border/70 bg-background/35 p-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex min-w-0 items-baseline gap-1">
        <span className={cn("num truncate text-xl font-semibold", TONE[tone])}>{value}</span>
        {unit && <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
