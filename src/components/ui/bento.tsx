import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grade bento mobile-first: 2 colunas, itens podem ocupar a linha inteira. */
export function Bento({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>;
}

export function BentoItem({
  span = 1,
  className,
  children,
}: {
  span?: 1 | 2;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", span === 2 && "col-span-2", className)}>{children}</div>
  );
}
