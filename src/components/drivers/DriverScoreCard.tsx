import { EcoScoreRing } from "@/components/eco/EcoScoreRing";
import { ecoBand } from "@/lib/eco/score";
import type { DriverPillars } from "@/lib/drivers/score";

const PILLAR_LABEL: Record<keyof DriverPillars, string> = {
  safety: "Direção segura",
  efficiency: "Eficiência de consumo",
  safeStart: "Partida segura",
};

const PILLAR_WEIGHT: Record<keyof DriverPillars, string> = {
  safety: "60%",
  efficiency: "30%",
  safeStart: "10%",
};

export function DriverScoreCard({
  score,
  pillars,
}: {
  score: number | null;
  pillars: DriverPillars;
}) {
  const band = ecoBand(score);
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-4">
        <EcoScoreRing score={score} size={104} label={score == null ? "Sem dados" : band.label} />
        <div className="min-w-0 flex-1 space-y-2.5">
          {(Object.keys(PILLAR_LABEL) as (keyof DriverPillars)[]).map((k) => {
            const v = pillars[k];
            const b = ecoBand(v);
            return (
              <div key={k}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {PILLAR_LABEL[k]}{" "}
                    <span className="text-[10px] opacity-70">({PILLAR_WEIGHT[k]})</span>
                  </span>
                  <span className={`font-semibold tabular-nums ${b.color}`}>
                    {v == null ? "—" : v}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${v ?? 0}%`, background: b.stroke }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
