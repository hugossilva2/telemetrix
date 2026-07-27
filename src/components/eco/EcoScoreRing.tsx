import { ecoBand } from "@/lib/eco/score";

export function EcoScoreRing({
  score,
  size = 96,
  strokeWidth = 8,
  label,
}: {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const band = ecoBand(score);
  const value = Number.isFinite(Number(score)) ? Number(score) : 0;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Nota ${value}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={band.stroke}
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className={`rotate-90 fill-current text-xl font-bold tabular-nums ${band.color}`}
          style={{ transformOrigin: "center" }}
        >
          {score == null ? "—" : Math.round(value)}
        </text>
      </svg>
      <span className={`text-xs font-medium ${band.color}`}>{label ?? band.label}</span>
    </div>
  );
}

export function EcoScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const band = ecoBand(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${band.bg} ${band.color}`}
      title={`Eco Score: ${band.label}`}
    >
      {Math.round(Number(score))} eco
    </span>
  );
}
