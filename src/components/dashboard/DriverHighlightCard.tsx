import { Link } from "@tanstack/react-router";
import { ChevronRight, Trophy } from "lucide-react";
import { DriverAvatar } from "@/components/drivers/DriverAvatar";
import { EcoScoreRing } from "@/components/eco/EcoScoreRing";
import { useHighlightDriver } from "@/lib/drivers/ranking";
import { driverBadges, BADGE_CLASSES } from "@/lib/drivers/score";
import { formatKm } from "@/lib/format";

/** Destaque do condutor no Painel: nota consolidada + selos conquistados. */
export function DriverHighlightCard() {
  const { highlight, ranking, isLoading } = useHighlightDriver();

  if (isLoading || !highlight) return null;

  const { driver, result } = highlight;
  const badges = driverBadges(result).slice(0, 2);
  const position = ranking.findIndex((r) => r.driver.id === driver.id) + 1;

  return (
    <Link
      to="/motoristas/$id"
      params={{ id: driver.id }}
      className="mt-4 flex items-center gap-3 card-surface p-4"
    >
      <EcoScoreRing score={result.score} size={72} strokeWidth={7} label="nota" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <DriverAvatar name={driver.name} photoPath={driver.photo_path} size={28} />
          <p className="truncate text-sm font-semibold">{driver.name}</p>
          {ranking.length > 1 && position > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              <Trophy className="size-3" />
              {position}º
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {result.stats.trips} viagens · {formatKm(result.stats.distanceKm)}
        </p>
        {badges.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.id}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BADGE_CLASSES[b.tone]}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
