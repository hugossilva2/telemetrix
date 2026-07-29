import { useEffect, useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { useOpenTrip } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";
import { formatDurationSeconds } from "@/lib/trips/format";

export function OngoingTripBanner() {
  const open = useOpenTrip();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const durationS = Math.max(
    0,
    Math.floor((now - new Date(open.startTime).getTime()) / 1000),
  );

  let distanceKm: number | null = null;
  if (
    typeof open.mileageAtStart === "number" &&
    typeof open.lastMileage === "number" &&
    open.lastMileage >= open.mileageAtStart
  ) {
    distanceKm = open.lastMileage - open.mileageAtStart;
  } else if (
    typeof open.startLat === "number" &&
    typeof open.startLng === "number" &&
    typeof open.lastLat === "number" &&
    typeof open.lastLng === "number"
  ) {
    distanceKm = haversineKm(open.startLat, open.startLng, open.lastLat, open.lastLng);
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-3">
      <div className="grid size-9 place-items-center rounded-full bg-success/20 text-success">
        <RouteIcon className="size-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-success">
          Viagem em andamento
        </div>
        <div className="text-sm font-medium tabular-nums">
          {formatDurationSeconds(durationS)}
          {distanceKm !== null && (
            <span className="text-muted-foreground"> · {distanceKm.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </div>
  );
}
