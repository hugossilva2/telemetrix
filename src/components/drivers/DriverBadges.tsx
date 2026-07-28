import { BADGE_CLASSES, driverBadges, type DriverScore } from "@/lib/drivers/score";

export function DriverBadges({ score }: { score: DriverScore }) {
  const badges = driverBadges(score);
  if (badges.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Ainda sem destaques — eles aparecem conforme as viagens forem registradas.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span
          key={b.id}
          title={b.description}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${BADGE_CLASSES[b.tone]}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
