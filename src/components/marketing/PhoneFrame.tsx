import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Rótulo de acessibilidade da tela mostrada. */
  label?: string;
}

/** Moldura de celular para exibir telas do app nas páginas de marketing. */
export function PhoneFrame({ children, className, label }: Props) {
  return (
    <div
      aria-label={label}
      className={cn(
        "relative mx-auto w-full max-w-[390px] rounded-[2.2rem] border border-border/80 bg-card p-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-muted/60" />
      <div className="h-[720px] overflow-hidden rounded-[1.8rem] bg-background">
        <div className="h-full overflow-y-auto overscroll-contain px-3 pb-6 pt-7">{children}</div>
      </div>
    </div>
  );
}
