import { C } from "../theme";
import { display } from "../fonts";

interface Props {
  size: number;
  progress: number;
  label: string;
  value: string;
  unit: string;
  color?: string;
  strokeWidth?: number;
}

/** Anel neon inspirado no GaugeRing do app. */
export const Gauge = ({
  size,
  progress,
  label,
  value,
  unit,
  color = C.primary,
  strokeWidth = 14,
}: Props) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const sweep = 0.75;
  const dash = circumference * sweep * Math.max(0, Math.min(1, progress));

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(135deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(240,255,250,0.10)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * sweep} ${circumference}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 14px ${color}aa)` }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: display,
            fontSize: size * 0.26,
            fontWeight: 700,
            color: C.fg,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: size * 0.09, color: C.muted, letterSpacing: 1 }}>{unit}</span>
        <span
          style={{
            fontSize: size * 0.085,
            color: color,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginTop: size * 0.03,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
