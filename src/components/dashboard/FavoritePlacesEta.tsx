import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { getRouteEta } from "@/lib/places.functions";
import { iconFor } from "@/routes/_authenticated/lugares";
import { StartTripDialog, useStartTripDialog } from "@/components/trips/StartTripDialog";

function formatEta(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h}h${rest.toString().padStart(2, "0")}`;
}

export function FavoritePlacesEta() {
  const { telemetry } = useFlespiMqtt();
  const eta = useServerFn(getRouteEta);
  const startTrip = useStartTripDialog();


  const { data: places = [] } = useQuery({
    queryKey: ["favorite_places"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_places")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const hasOrigin = typeof lat === "number" && typeof lng === "number";

  // Bucketize origin to avoid refetching for every tiny GPS jitter (~1km grid).
  const originKey = hasOrigin
    ? `${(lat! * 100).toFixed(0)}_${(lng! * 100).toFixed(0)}`
    : "none";

  const etaQueries = useQueries({
    queries: places.map((p) => ({
      queryKey: ["favorite_places_eta", p.id, originKey],
      enabled: hasOrigin,
      staleTime: 60_000,
      refetchInterval: 90_000,
      queryFn: () =>
        eta({
          data: {
            origin: { lat: lat!, lng: lng! },
            destination: { lat: p.lat, lng: p.lng },
          },
        }),
    })),
  });

  if (places.length === 0) {
    return (
      <section className="mt-4">
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
    <section className="mt-4">
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
                  className="flex min-w-[140px] flex-col gap-1 rounded-2xl border border-border bg-card p-3 text-left transition active:scale-[0.98] hover:border-primary/50"
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
