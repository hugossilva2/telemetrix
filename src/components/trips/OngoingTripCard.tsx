import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Clock, Fuel, Route as RouteIcon, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useOpenTrip } from "@/lib/trips/store";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/trips/geo";
import { formatDurationSeconds } from "@/lib/trips/format";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";

const MiniTripMap = lazy(() => import("@/components/map/MiniTripMap"));

export function OngoingTripCard() {
  const open = useOpenTrip();
  const { telemetry } = useFlespiMqtt();
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
    <section className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Viagem em andamento
          </span>
        </div>
        <span className="text-xs tabular-nums text-emerald-500/80">
          {typeof telemetry.speedKmh === "number" ? `${telemetry.speedKmh.toFixed(0)} km/h` : "—"}
        </span>
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
