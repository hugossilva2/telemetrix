import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GaugeZone {
  /** Início da faixa, no mesmo domínio de `max`. */
  from: number;
  /** Fim da faixa, no mesmo domínio de `max`. */
  to: number;
  /** Classe de cor aplicada ao traço (usar tokens semânticos). */
  className: string;
}

interface Props {
  /** Valor atual. `undefined` = sem dado. */
  value?: number;
  max: number;
  /** Rótulo curto acima do valor. */
  label: string;
  /** Conteúdo central (valor + unidade). */
  children: ReactNode;
  /** Faixas destacadas no anel de fundo (ex.: faixa eco de RPM). */
  zones?: GaugeZone[];
  /** Cor do arco de progresso. */
  arcClassName?: string;
  dimmed?: boolean;
  className?: string;
}

// Arco de 270°, aberto na parte de baixo, como um mostrador de painel.
const SWEEP = 270;
const START = 135;
const R = 42;
const CX = 50;
const CY = 50;
const CIRC = 2 * Math.PI * R;
const ARC_LEN = (CIRC * SWEEP) / 360;

function polar(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function arcPath(fromRatio: number, toRatio: number) {
  const a0 = START + SWEEP * fromRatio;
  const a1 = START + SWEEP * toRatio;
  const p0 = polar(a0);
  const p1 = polar(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Mostrador circular em anel, no estilo do Eco Score: anel de fundo, faixas
 * opcionais e arco de progresso animado.
 */
export function GaugeRing({
  value,
  max,
  label,
  children,
  zones,
  arcClassName = "text-primary",
  dimmed = false,
  className,
}: Props) {
  const hasValue = value !== undefined && Number.isFinite(value);
  const ratio = hasValue ? clamp01((value as number) / max) : 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 transition-opacity",
        dimmed && "opacity-60",
        className,
      )}
    >
      <div className="relative w-full max-w-[132px]">
        <svg viewBox="0 0 100 100" className="w-full" role="presentation">
          {/* trilha */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
            className="text-muted/40"
          />
          {/* faixas destacadas */}
          {zones?.map((z, i) => (
            <path
              key={i}
              d={arcPath(clamp01(z.from / max), clamp01(z.to / max))}
              fill="none"
              stroke="currentColor"
              strokeWidth={7}
              strokeLinecap="butt"
              className={cn("opacity-35", z.className)}
            />
          ))}
          {/* progresso */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            strokeDashoffset={ARC_LEN * (1 - ratio)}
            className={cn(
              "gauge-arc drop-shadow-[0_0_6px_currentColor]",
              hasValue ? arcClassName : "text-transparent",
            )}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center leading-none">{children}</div>
        </div>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
