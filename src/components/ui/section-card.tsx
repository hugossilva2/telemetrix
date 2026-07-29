import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  footer?: ReactNode;
  glow?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/** Card padrão do app: cabeçalho com ícone/ação e corpo com respiro consistente. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  footer,
  glow,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || action || Icon);
  return (
    <section className={cn("card-surface overflow-hidden", glow && "card-glow", className)}>
      {hasHeader && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-4.5" />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate font-display text-sm font-semibold tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : <span />}
        </header>
      )}
      <div className={cn("p-4", hasHeader && "pt-3", bodyClassName)}>{children}</div>
      {footer && (
        <div className="border-t border-border/70 bg-background/25 px-4 py-3">{footer}</div>
      )}
    </section>
  );
}
