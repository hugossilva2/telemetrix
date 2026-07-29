import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  emerald: "bg-success/15 text-success",
  sky: "bg-chart-3/20 text-chart-3",
  amber: "bg-warning/15 text-warning",
};

export function TelemetryCard({
  label,
  value,
  Icon,
  accent = "primary",
  children,
  className = "",
}: Props) {
  return (
    <div className={cn("card-surface h-full p-4 transition-opacity", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", accentBg[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="num mt-2 truncate text-2xl font-semibold">{value}</div>
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
