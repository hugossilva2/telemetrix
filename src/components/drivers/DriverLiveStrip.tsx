import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { DriverAvatar } from "@/components/drivers/DriverAvatar";
import { useDrivers } from "@/lib/drivers/api";
import { ecoBand } from "@/lib/eco/score";

/**
 * Faixa com a foto e o nome do condutor ativo durante a viagem,
 * junto das estatísticas em tempo real (nota, velocidade, distância).
 */
export function DriverLiveStrip({
  ecoScore,
  speedKmh,
  distanceKm,
}: {
  ecoScore: number | null;
  speedKmh: number | null | undefined;
  distanceKm: number;
}) {
  const { data: drivers = [] } = useDrivers();
  const driver = drivers.find((d) => d.is_default) ?? drivers[0];
  if (!driver) return null;

  const band = ecoBand(ecoScore);

  return (
    <Link
      to="/motoristas/$id"
      params={{ id: driver.id }}
      className="flex items-center gap-3 border-t border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
    >
      <DriverAvatar name={driver.name} photoPath={driver.photo_path} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{driver.name}</p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {typeof speedKmh === "number" ? `${speedKmh.toFixed(0)} km/h` : "— km/h"} ·{" "}
          {distanceKm.toFixed(1)} km
        </p>
      </div>
      <span className={`text-sm font-bold tabular-nums ${band.color}`}>
        {ecoScore == null ? "—" : ecoScore}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
