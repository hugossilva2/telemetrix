import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus } from "lucide-react";
import { haversineKm } from "@/lib/trips/geo";
import { useFavoritePlaces } from "@/lib/places/useFavoritePlaces";
import { useTelemetry } from "@/hooks/useTelemetry";
import { getRouteEta } from "@/lib/places.functions";
import { iconFor } from "@/lib/places/icons";
import { formatEta } from "@/lib/format";
import { StartTripDialog, useStartTripDialog } from "@/components/trips/StartTripDialog";

const ETA_PLACE_LIMIT = 4;

export function FavoritePlacesEta() {
  const { telemetry } = useTelemetry();
  const eta = useServerFn(getRouteEta);
  const startTrip = useStartTripDialog();


  const { data: allPlaces = [] } = useFavoritePlaces();

  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const hasOrigin = typeof lat === "number" && typeof lng === "number";

  // Bucketize origin to avoid refetching for every tiny GPS jitter (~1km grid).
  const originKey = hasOrigin
    ? `${(lat! * 100).toFixed(0)}_${(lng! * 100).toFixed(0)}`
    : "none";

  // Teto de chamadas de rota: só os 4 locais mais próximos, a cada 3 minutos.
  const places = useMemo(() => {
    if (!hasOrigin) return allPlaces.slice(0, ETA_PLACE_LIMIT);
    return [...allPlaces]
      .sort(
        (a, b) =>
          haversineKm(lat!, lng!, a.lat, a.lng) - haversineKm(lat!, lng!, b.lat, b.lng),
      )
      .slice(0, ETA_PLACE_LIMIT);
  }, [allPlaces, hasOrigin, originKey]);

  const etaQueries = useQueries({
    queries: places.map((p) => ({
      queryKey: ["favorite_places_eta", p.id, originKey],
      enabled: hasOrigin,
      staleTime: 120_000,
      refetchInterval: 180_000,
      queryFn: () =>
        eta({
          data: {
            origin: { lat: lat!, lng: lng! },
            destination: { lat: p.lat, lng: p.lng },
          },
        }),
    })),
  });

  if (allPlaces.length === 0) {
    return (
      <section className="contents">
        <Link
          to="/lugares"
          className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-card/60 p-3 text-sm"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            Salve locais frequentes (Casa, Trabalho…)
          </span>
          <Plus className="size-4 text-primary" />
        </Link>
      </section>
    );
  }

  return (
    <section className="contents">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ir para
        </h2>
        <Link to="/lugares" className="text-xs text-primary">
          Gerenciar
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <ul className="flex snap-x gap-2">
          {places.map((p, i) => {
            const Icon = iconFor(p.icon);
            const q = etaQueries[i];
            const seconds = q?.data?.durationSeconds;
            const km = q?.data?.distanceMeters
              ? (q.data.distanceMeters / 1000).toFixed(1)
              : null;
            const etaText = typeof seconds === "number" ? formatEta(seconds) : null;
            return (
              <li key={p.id} className="snap-start">
                <button
                  type="button"
                  onClick={() =>
                    startTrip.openFor({
                      id: p.id,
                      name: p.name,
                      icon: p.icon,
                      lat: p.lat,
                      lng: p.lng,
                      geofence_radius_m: (p as { geofence_radius_m?: number }).geofence_radius_m ?? 150,
                    })
                  }
                  className="flex min-w-[140px] flex-col gap-1 card-surface p-3 text-left transition active:scale-[0.98] hover:border-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                  </div>
                  {!hasOrigin ? (
                    <span className="text-xs text-muted-foreground">Sem GPS</span>
                  ) : q?.isLoading ? (
                    <span className="text-xs text-muted-foreground">Calculando…</span>
                  ) : q?.isError ? (
                    <span className="text-xs text-destructive">Falhou</span>
                  ) : etaText ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold tabular-nums text-primary">
                        {etaText}
                      </span>
                      {km && (
                        <span className="text-xs text-muted-foreground">· {km} km</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <StartTripDialog
        open={startTrip.open}
        onOpenChange={(o) => (!o ? startTrip.close() : null)}
        place={startTrip.place}
        etaInfo={(() => {
          const p = startTrip.place;
          if (!p) return null;
          const idx = places.findIndex((x) => x.id === p.id);
          const q = idx >= 0 ? etaQueries[idx] : undefined;
          const s = q?.data?.durationSeconds;
          const km = q?.data?.distanceMeters
            ? (q.data.distanceMeters / 1000).toFixed(1)
            : null;
          if (typeof s !== "number") return null;
          return (
            <span className="block text-foreground">
              <span className="font-semibold text-primary">{formatEta(s)}</span>
              {km && <span className="text-muted-foreground"> · {km} km</span>}
            </span>
          );
        })()}
      />
    </section>
  );

}
