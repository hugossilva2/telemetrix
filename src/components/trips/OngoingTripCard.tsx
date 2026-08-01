import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Clock, Fuel, Route as RouteIcon, Wallet, Navigation, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useOpenTrip } from "@/lib/trips/store";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/trips/geo";
import { formatDurationSeconds } from "@/lib/trips/format";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import { useTelemetry } from "@/hooks/useTelemetry";
import { tripDestinationStore, useTripDestination } from "@/lib/trips/activeDestination";
import { Button } from "@/components/ui/button";
import { summarizeEco, ecoBand } from "@/lib/eco/score";
import { DriverLiveStrip } from "@/components/drivers/DriverLiveStrip";
import { LivePerformanceBadge } from "@/components/eco/LivePerformanceBadge";
import { getFuelKind } from "@/lib/eco/settings";


const MiniTripMap = lazy(() => import("@/components/map/MiniTripMap"));

export function OngoingTripCard() {
  const open = useOpenTrip();
  const { telemetry } = useTelemetry();
  const { active: destination, pending: pendingDestination } = useTripDestination();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const { data: vehicleInfo } = useQuery({
    queryKey: ["ongoing-trip-vehicle"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { kmpl: 10, price: DEFAULT_GAS_PRICE_PER_LITER };
      const [{ data: v }, { data: f }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("avg_consumption_kmpl")
          .eq("user_id", uid)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("fuel_logs")
          .select("price_per_liter")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        kmpl: Number(v?.avg_consumption_kmpl) || 10,
        price: Number(f?.price_per_liter) || DEFAULT_GAS_PRICE_PER_LITER,
      };
    },
    staleTime: 60_000,
  });

  // Distância até o destino (se houver) e detecção de chegada
  const currLat = telemetry.latitude;
  const currLng = telemetry.longitude;
  const remainingKm =
    destination && typeof currLat === "number" && typeof currLng === "number"
      ? haversineKm(currLat, currLng, destination.lat, destination.lng)
      : null;

  useEffect(() => {
    if (!destination || remainingKm === null) return;
    if (remainingKm * 1000 <= destination.radiusM) {
      tripDestinationStore.setActive(null);
    }
  }, [destination, remainingKm]);

  if (!open && !pendingDestination) return null;

  if (!open && pendingDestination) {
    return (
      <section className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="size-4 text-warning" />
          <span className="text-warning">
            Viagem programada para <b>{pendingDestination.name}</b> — começa ao ligar o carro.
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => tripDestinationStore.setPending(null)}
          aria-label="Cancelar destino"
        >
          <X className="size-4" />
        </Button>
      </section>
    );
  }

  if (!open) return null;


  const durationS = Math.max(
    0,
    Math.floor((now - new Date(open.startTime).getTime()) / 1000),
  );

  let distanceKm = 0;
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

  const kmpl = vehicleInfo?.kmpl ?? 10;
  const price = vehicleInfo?.price ?? DEFAULT_GAS_PRICE_PER_LITER;
  const liters = kmpl > 0 ? distanceKm / kmpl : 0;
  const cost = liters * price;

  const avgSpeedKmh = durationS > 0 ? (distanceKm / durationS) * 3600 : null;
  const eco = summarizeEco({
    events: open.ecoEvents ?? [],
    idleSeconds: open.idleSeconds ?? 0,
    distanceKm,
    kmpl,
    pricePerLiter: price,
    fuel: getFuelKind(),
    avgSpeedKmh,
  });

  const band = ecoBand(eco.score);

  const start: [number, number] | null =
    typeof open.startLat === "number" && typeof open.startLng === "number"
      ? [open.startLat, open.startLng]
      : null;

  const currentLat = telemetry.latitude ?? open.lastLat;
  const currentLng = telemetry.longitude ?? open.lastLng;
  const current: [number, number] | null =
    typeof currentLat === "number" && typeof currentLng === "number"
      ? [currentLat, currentLng]
      : null;

  const moving = (telemetry.speedKmh ?? 0) > 3;

  const mapFallback = (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      Carregando mapa…
    </div>
  );

  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-success/30 bg-success/5">
      <div className="flex items-center justify-between border-b border-success/20 bg-success/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-success">
            {destination ? `Indo para ${destination.name}` : "Viagem em andamento"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-success/80">
            {typeof telemetry.speedKmh === "number" ? `${telemetry.speedKmh.toFixed(0)} km/h` : "—"}
          </span>
          {destination && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-success hover:text-success"
              onClick={() => tripDestinationStore.setActive(null)}
              aria-label="Encerrar destino"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>


      <div className="h-44 w-full">
        <ClientOnly fallback={mapFallback}>
          <Suspense fallback={mapFallback}>
            <MiniTripMap
              trail={open.trail}
              start={start}
              current={current}
              moving={moving}
            />
          </Suspense>
        </ClientOnly>
      </div>

      <DriverLiveStrip
        ecoScore={eco.score}
        speedKmh={telemetry.speedKmh}
        distanceKm={distanceKm}
      />

      <LivePerformanceBadge />



      {destination && remainingKm !== null && (
        <div className="flex items-center justify-between border-t border-success/20 bg-success/5 px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-success">
            <Navigation className="size-3.5" />
            {remainingKm < 1
              ? `${Math.round(remainingKm * 1000)} m restantes`
              : `${remainingKm.toFixed(1)} km restantes`}
          </span>
          <span className="text-muted-foreground">até {destination.name}</span>
        </div>
      )}



      <div className="flex items-center justify-between border-t border-success/20 px-3 py-2 text-xs">
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Eco Score</span>
          <span className={`font-semibold tabular-nums ${band.color}`}>
            {eco.score} · {band.label}
          </span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {eco.totalEvents} evento(s)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3">
        <KpiTile Icon={Clock} label="Tempo" value={formatDurationSeconds(durationS)} />
        <KpiTile Icon={RouteIcon} label="Distância" value={`${distanceKm.toFixed(2)} km`} />
        <KpiTile Icon={Fuel} label="Consumo" value={`${liters.toFixed(2)} L`} />
        <KpiTile Icon={Wallet} label="Custo" value={`R$ ${cost.toFixed(2)}`} />
      </div>
    </section>
  );
}

function KpiTile({
  Icon,
  label,
  value,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
