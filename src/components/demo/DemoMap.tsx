import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** `trip` desenha a rota percorrida; `tracker` foca no veículo e no usuário. */
  variant?: "trip" | "tracker";
}

const TRIP_PATH =
  "M 18 168 C 60 150, 74 120, 112 112 C 150 104, 168 74, 214 62 C 254 52, 286 40, 330 28";

/**
 * Mapa estilizado (SVG) para as telas de demonstração e prints de marketing.
 * Não usa provedor de mapas nem rede — apenas tokens do design system.
 */
export function DemoMap({ className, variant = "trip" }: Props) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-muted/25", className)}>
      <svg viewBox="0 0 350 190" className="size-full" role="presentation">
        {/* malha de ruas */}
        <g className="text-border" stroke="currentColor" strokeWidth={1} opacity={0.5}>
          {[20, 60, 100, 140, 180].map((y) => (
            <line key={y} x1={0} y1={y} x2={350} y2={y} />
          ))}
          {[40, 100, 160, 220, 280, 330].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={190} />
          ))}
        </g>
        {/* avenidas */}
        <g className="text-muted-foreground" stroke="currentColor" strokeWidth={4} opacity={0.25}>
          <line x1={0} y1={130} x2={350} y2={96} />
          <line x1={220} y1={0} x2={180} y2={190} />
        </g>

        {variant === "trip" ? (
          <>
            <path
              d={TRIP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={7}
              strokeLinecap="round"
              className="text-primary/25"
            />
            <path
              d={TRIP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              className="text-primary drop-shadow-[0_0_6px_currentColor]"
            />
            <circle cx={18} cy={168} r={5} className="fill-muted-foreground" />
            <circle
              cx={330}
              cy={28}
              r={6}
              className="fill-primary drop-shadow-[0_0_8px_currentColor] text-primary"
            />
          </>
        ) : (
          <>
            <line
              x1={92}
              y1={140}
              x2={236}
              y2={62}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="6 6"
              className="text-primary/60"
            />
            <circle cx={92} cy={140} r={16} className="fill-primary/10" />
            <circle cx={92} cy={140} r={5} className="fill-primary" />
            <circle
              cx={236}
              cy={62}
              r={7}
              className="fill-success drop-shadow-[0_0_8px_currentColor] text-success"
            />
            <circle cx={236} cy={62} r={17} className="fill-success/10" />
          </>
        )}
      </svg>
      <span className="absolute bottom-1 right-2 text-[9px] text-muted-foreground">
        dados fictícios
      </span>
    </div>
  );
}
