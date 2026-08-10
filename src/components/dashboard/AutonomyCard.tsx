import { useEffect, useRef } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fuel, Gauge, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useLiveAutonomy } from "@/hooks/useLiveAutonomy";
import { getRouteEta, nearbyGasStations } from "@/lib/places.functions";
import {
  FUEL_STAGE_CLASS,
  FUEL_STAGE_LABEL,
  REFUEL_ALERT_PCT,
} from "@/lib/eco/autonomy";

function formatEta(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h}h${rest.toString().padStart(2, "0")}`;
}

function mapsUrl(lat: number, lng: number, placeId: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${placeId}&travelmode=driving`;
}

/**
 * Autonomia em tempo real do tanque, calculada pelo consumo real da viagem
 * atual, com aviso e lista de postos próximos um pouco antes da reserva.
 */
export function AutonomyCard() {
  const live = useLiveAutonomy();
  const { telemetry } = useTelemetry();
  const stations = useServerFn(nearbyGasStations);
  const eta = useServerFn(getRouteEta);

  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const hasOrigin = typeof lat === "number" && typeof lng === "number";
  // Arredonda a origem (~1 km) para não refazer a busca a cada oscilação do GPS.
  const originKey = hasOrigin ? `${(lat * 100).toFixed(0)}_${(lng * 100).toFixed(0)}` : "none";

  const { data: posts = [], isFetching } = useQuery({
    queryKey: ["nearby-gas-stations", originKey],
    enabled: live.needsRefuel && hasOrigin,
    staleTime: 5 * 60_000,
    queryFn: () => stations({ data: { lat: lat as number, lng: lng as number, limit: 3 } }),
  });

  const etaQueries = useQueries({
    queries: posts.map((p) => ({
      queryKey: ["nearby-gas-eta", p.placeId, originKey],
      enabled: hasOrigin,
      staleTime: 5 * 60_000,
      queryFn: () =>
        eta({
          data: {
            origin: { lat: lat as number, lng: lng as number },
            destination: { lat: p.lat, lng: p.lng },
          },
        }),
    })),
  });

  // Aviso único ao entrar no nível de abastecimento.
  const warned = useRef(false);
  useEffect(() => {
    if (!live.needsRefuel) {
      warned.current = false;
      return;
    }
    if (warned.current) return;
    warned.current = true;
    toast.warning("Hora de abastecer", {
      description:
        live.autonomyKm != null
          ? `Restam cerca de ${Math.round(live.autonomyKm)} km de autonomia.`
          : `Tanque abaixo de ${REFUEL_ALERT_PCT}%.`,
      duration: 10_000,
    });
  }, [live.needsRefuel, live.autonomyKm]);

  return (
    <section className={cn("card-surface p-4", !live.ignitionOn && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Gauge className="size-3.5" />
          Autonomia em tempo real
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
            FUEL_STAGE_CLASS[live.stage],
          )}
        >
          {FUEL_STAGE_LABEL[live.stage]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Autonomia</div>
          <div className="num text-2xl font-semibold">
            {live.autonomyKm != null ? Math.round(live.autonomyKm) : "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">km</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Consumo</div>
          <div className="num text-2xl font-semibold">
            {live.kmpl != null ? live.kmpl.toFixed(1) : "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">km/L</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {live.source === "medido" ? "medido nesta viagem" : "estimado pela condução"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Tanque</div>
          <div className="num text-2xl font-semibold">
            {live.fuelPct != null ? `${Math.round(live.fuelPct)}%` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {live.liters != null ? `${live.liters.toFixed(0)} L` : "sem dado"}
          </div>
        </div>
      </div>

      {live.needsRefuel && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Fuel className="size-3.5 text-warning" />
            Postos mais próximos
          </div>

          {!hasOrigin ? (
            <p className="mt-2 text-xs text-muted-foreground">Aguardando posição do GPS…</p>
          ) : isFetching && posts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Buscando postos por perto…</p>
          ) : posts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum posto encontrado num raio de 15 km.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {posts.map((p, i) => {
                const seconds = etaQueries[i]?.data?.durationSeconds;
                return (
                  <li key={p.placeId}>
                    <a
                      href={mapsUrl(p.lat, p.lng, p.placeId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2 transition-colors hover:border-primary/50"
                    >
                      <MapPin className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {p.address}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-xs font-semibold">
                          {p.distanceKm.toFixed(1)} km
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {seconds != null ? formatEta(seconds) : "—"}
                        </span>
                      </span>
                      <Navigation className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {!live.ignitionOn && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Última leitura conhecida — ligue o motor para atualizar.
        </p>
      )}
    </section>
  );
}
