import type { ReactNode } from "react";
import { VehicleSwitcher } from "@/components/vehicles/VehicleSwitcher";

interface AppShellProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, action, children }: AppShellProps) {
  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.75rem)" }}
    >
      <header
        className="sticky top-0 z-30 border-b border-border/70 bg-background/80 px-4 pb-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.875rem)" }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <VehicleSwitcher />
            {action}
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-3 px-4 py-4">{children}</main>
    </div>
  );
}
