import { Link } from "@tanstack/react-router";
import { Medal, Trophy } from "lucide-react";
import { DriverAvatar } from "./DriverAvatar";
import { useDriverRanking } from "@/lib/drivers/ranking";
import { driverBadges } from "@/lib/drivers/score";
import { ecoBand } from "@/lib/eco/score";
import { formatKm } from "@/lib/format";

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-600"];

export function DriverRanking() {
  const { data = [], isLoading } = useDriverRanking();
  const scored = data.filter((r) => r.result.stats.trips > 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Trophy className="size-4 text-amber-400" /> Ranking de condutores
      </h2>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Calculando notas…</p>
      ) : scored.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Assim que houver viagens vinculadas a um condutor, o ranking aparece aqui.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {scored.map((r, i) => {
            const band = ecoBand(r.result.score);
            const topBadge = driverBadges(r.result)[0];
            return (
              <li key={r.driver.id}>
                <Link
                  to="/motoristas/$id"
                  params={{ id: r.driver.id }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                >
                  <span
                    className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${
                      MEDAL[i] ?? "text-muted-foreground"
                    }`}
                  >
                    {i < 3 ? <Medal className={`size-4 ${MEDAL[i]}`} /> : i + 1}
                  </span>
                  <DriverAvatar name={r.driver.name} photoPath={r.driver.photo_path} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.driver.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.result.stats.trips} viagens · {formatKm(r.result.stats.distanceKm)}
                      {topBadge ? ` · ${topBadge.label}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-lg font-bold tabular-nums ${band.color}`}>
                    {r.result.score ?? "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
