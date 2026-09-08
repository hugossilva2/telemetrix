import { BadgeCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Espelha trips.fuel_source. */
export type FuelSourceValue =
  | "calibrado"
  | "ficha"
  | "device"
  | "padrao"
  /** medido em tempo real na viagem atual */
  | "viagem"
  | null
  | undefined;

export function fuelSourceText(source: FuelSourceValue): string | null {
  switch (source) {
    case "calibrado":
      return "medido nos seus abastecimentos";
    case "device":
      return "medido pelo sensor do carro";
    case "viagem":
      return "medido nesta viagem";
    case "ficha":
    case "padrao":
      return "estimado pela ficha técnica";
    default:
      return null;
  }
}

function isMeasured(source: FuelSourceValue) {
  return source === "calibrado" || source === "device" || source === "viagem";
}

/** Selo discreto explicando de onde veio o km/L exibido. */
export function FuelSourceBadge({
  source,
  className,
  as = "badge",
}: {
  source: FuelSourceValue;
  className?: string;
  /** "text" mostra apenas o texto, sem borda — para linhas de apoio de cards. */
  as?: "badge" | "text";
}) {
  const text = fuelSourceText(source);
  if (!text) return null;
  const measured = isMeasured(source);
  const Icon = measured ? BadgeCheck : FileText;

  if (as === "text") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] text-muted-foreground", className)}>
        <Icon className={cn("size-3", measured && "text-success")} />
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        measured
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3" />
      {text}
    </span>
  );
}
