import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, action, children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          {action}
        </div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
