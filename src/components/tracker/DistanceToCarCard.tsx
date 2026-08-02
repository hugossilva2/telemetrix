import { Car, Crosshair, Navigation, ShieldQuestion } from "lucide-react";
import { haversineKm } from "@/lib/trips/geo";
import { useMyLocation, type MyLocation } from "@/hooks/useMyLocation";

interface Props {
  carLat?: number;
  carLng?: number;
  /** Fonte da posição do carro é o último ponto estacionado? */
  usingParked?: boolean;
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

function bearingLabel(from: MyLocation, lat: number, lng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return { deg, dir: dirs[Math.round(((deg + 360) % 360) / 45) % 8] };
}

/**
 * Mostra a distância entre mim (GPS do celular) e o carro.
 */
export function DistanceToCarCard({ carLat, carLng, usingParked }: Props) {
  const { position, error, supported } = useMyLocation();

  const hasCar = typeof carLat === "number" && typeof carLng === "number";
  const km =
    position && hasCar ? haversineKm(position.lat, position.lng, carLat!, carLng!) : null;
  const bearing = position && hasCar ? bearingLabel(position, carLat!, carLng!) : null;

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          {km !== null ? (
            <Navigation
              className="size-5"
              style={{ transform: `rotate(${bearing?.deg ?? 0}deg)` }}
            />
          ) : (
            <ShieldQuestion className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Distância até o carro
          </div>
          <div className="font-display truncate text-lg font-semibold">
            {km !== null ? (
              <>
                <span className="num">{formatDistance(km)}</span>
                {bearing && (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    a {bearing.dir}
                  </span>
                )}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-background/35 px-3 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Crosshair className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {!supported
              ? "Este aparelho não expõe o GPS"
              : error
                ? error
                : position
                  ? `Você: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
                  : "Obtendo sua localização…"}
          </span>
          {position?.accuracyM != null && (
            <>
              <span aria-hidden>•</span>
              <span className="num shrink-0">±{Math.round(position.accuracyM)} m</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Car className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {hasCar
              ? `Carro${usingParked ? " (estacionado)" : ""}: ${carLat!.toFixed(5)}, ${carLng!.toFixed(5)}`
              : "Aguardando posição do veículo"}
          </span>
        </div>
      </div>
    </div>
  );
}
