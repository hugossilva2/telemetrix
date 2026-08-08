import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Crosshair,
  Fuel,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Route as RouteIcon,
  Timer,
  Trash2,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { searchPlaces, getPlaceDetails, type PlaceSuggestion } from "@/lib/places.functions";
import { planRoute } from "@/lib/trips/planRoute.functions";
import {
  decodePolyline,
  tripPlanStore,
  useTripPlan,
  type PlanStop,
  type TripPlan,
} from "@/lib/trips/plan";
import { DEFAULT_GAS_PRICE_PER_LITER, estimatePlanCost } from "@/lib/trips/cost";
import { TripCostCard } from "@/components/trips/TripCostCard";
import { formatDurationSeconds } from "@/lib/trips/format";
import { formatBRL, formatDecimal } from "@/lib/format";
import { LongTripCard, useLongTripSummary } from "@/components/trips/LongTripCard";
import { getFuelKind } from "@/lib/eco/settings";
import { useActiveVehicle } from "@/lib/vehicles/active";

const PlanMap = lazy(() => import("@/components/trips/PlanMap"));

export const Route = createFileRoute("/_authenticated/planejar")({
  head: () => ({
    meta: [
      { title: "Planejar rota · Telemetrix" },
      {
        name: "description",
        content:
          "Monte a rota com paradas, veja distância, tempo, combustível e custo estimados antes de sair.",
      },
      { property: "og:title", content: "Planejar rota · Telemetrix" },
      {
        property: "og:description",
        content: "Rota com paradas, custo estimado e monitoramento de desvio em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanejarPage,
});

function PlaceSearch({
  label,
  value,
  onPick,
  onClear,
  bias,
  onUseCurrent,
}: {
  label: string;
  value: PlanStop | null;
  onPick: (stop: PlanStop) => void;
  onClear?: () => void;
  bias?: { lat: number; lng: number };
  onUseCurrent?: () => void;
}) {
  const [term, setTerm] = useState("");
  const search = useServerFn(searchPlaces);
  const details = useServerFn(getPlaceDetails);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["plan-places", term, bias?.lat, bias?.lng],
    queryFn: () => search({ data: { query: term, bias } }),
    enabled: term.trim().length >= 3 && !value,
    staleTime: 30_000,
  });

  const pick = async (s: PlaceSuggestion) => {
    try {
      const d = await details({ data: { placeId: s.placeId } });
      onPick({
        placeId: d.placeId,
        name: s.primaryText,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
      });
      setTerm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar o local");
    }
  };

  return (
    <div className="card-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {onUseCurrent && !value && (
          <button
            type="button"
            onClick={onUseCurrent}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            <Crosshair className="size-3" /> Usar posição atual
          </button>
        )}
      </div>

      {value ? (
        <div className="mt-2 flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            {value.address && (
              <p className="truncate text-xs text-muted-foreground">{value.address}</p>
            )}
          </div>
          {onClear && (
            <Button variant="ghost" size="icon" onClick={onClear} aria-label="Remover">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <Input
            className="mt-2"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar endereço ou lugar"
          />
          {isFetching && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Buscando…
            </p>
          )}
          {suggestions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="block truncate">{s.primaryText}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.secondaryText}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function PlanejarPage() {
  const { telemetry } = useTelemetry();
  const { vehicle } = useActiveVehicle();
  const plan = useTripPlan();
  const compute = useServerFn(planRoute);

  const [origin, setOrigin] = useState<PlanStop | null>(null);
  const [stops, setStops] = useState<PlanStop[]>([]);
  const [destination, setDestination] = useState<PlanStop | null>(null);
  const [addingStop, setAddingStop] = useState(false);

  const bias =
    typeof telemetry.latitude === "number" && typeof telemetry.longitude === "number"
      ? { lat: telemetry.latitude, lng: telemetry.longitude }
      : undefined;

  const { data: vehicleInfo } = useQuery({
    queryKey: ["plan-vehicle", vehicle?.id ?? null],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { kmpl: 10, price: DEFAULT_GAS_PRICE_PER_LITER };
      const [{ data: f }] = await Promise.all([
        supabase
          .from("fuel_logs")
          .select("price_per_liter")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        kmpl: Number(vehicle?.avg_consumption_kmpl) || 10,
        price: Number(f?.price_per_liter) || DEFAULT_GAS_PRICE_PER_LITER,
      };
    },
    staleTime: 60_000,
  });

  const kmpl = vehicleInfo?.kmpl ?? 10;
  const price = vehicleInfo?.price ?? DEFAULT_GAS_PRICE_PER_LITER;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!origin || !destination) throw new Error("Escolha origem e destino");
      const result = await compute({
        data: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          stops: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
        },
      });
      const distanceKm = result.distanceMeters / 1000;
      const fuelLiters = kmpl > 0 ? distanceKm / kmpl : 0;
      const next: TripPlan = {
        createdAt: new Date().toISOString(),
        origin,
        stops,
        destination,
        distanceKm,
        durationSeconds: result.durationSeconds,
        fuelLiters: Number(fuelLiters.toFixed(2)),
        cost: Number((fuelLiters * price).toFixed(2)),
        path: decodePolyline(result.encodedPolyline),
        monitoring: false,
      };
      tripPlanStore.set(next);
      return next;
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível calcular a rota"),
    onSuccess: () => toast.success("Rota calculada"),
  });

  const currentPos = useMemo(
    () =>
      typeof telemetry.latitude === "number" && typeof telemetry.longitude === "number"
        ? ([telemetry.latitude, telemetry.longitude] as [number, number])
        : null,
    [telemetry.latitude, telemetry.longitude],
  );

  const useCurrentAsOrigin = () => {
    if (!currentPos) {
      toast.error("Sem posição do rastreador no momento");
      return;
    }
    setOrigin({
      placeId: "current",
      name: "Posição atual do veículo",
      address: `${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}`,
      lat: currentPos[0],
      lng: currentPos[1],
    });
  };

  // Nível do tanque: leitura do veículo quando disponível, senão valor manual no plano.
  const telemetryFuel =
    typeof telemetry.fuelLevel === "number" && Number.isFinite(telemetry.fuelLevel)
      ? telemetry.fuelLevel
      : null;
  const fuelPercent = telemetryFuel ?? plan?.fuelPercent ?? 50;
  const longTrip = useLongTripSummary({
    plan,
    fuelPercent,
    kmpl,
    fuel: getFuelKind(),
  });

  return (
    <AppShell title="Planejar rota" subtitle="Paradas, custo estimado e desvio em tempo real">
      <div className="space-y-3">
        <PlaceSearch
          label="Origem"
          value={origin}
          onPick={setOrigin}
          onClear={() => setOrigin(null)}
          bias={bias}
          onUseCurrent={useCurrentAsOrigin}
        />

        {stops.map((stop, i) => (
          <PlaceSearch
            key={`${stop.placeId}-${i}`}
            label={`Parada ${i + 1}`}
            value={stop}
            onPick={() => undefined}
            onClear={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        {addingStop && (
          <PlaceSearch
            label={`Parada ${stops.length + 1}`}
            value={null}
            onPick={(s) => {
              setStops((prev) => [...prev, s]);
              setAddingStop(false);
            }}
            bias={bias}
          />
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setAddingStop(true)}
          disabled={addingStop || stops.length >= 8}
        >
          <Plus className="mr-1 size-4" /> Adicionar parada
        </Button>

        <PlaceSearch
          label="Destino"
          value={destination}
          onPick={setDestination}
          onClear={() => setDestination(null)}
          bias={bias}
        />

        <Button
          className="w-full"
          onClick={() => mutation.mutate()}
          disabled={!origin || !destination || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <RouteIcon className="mr-1 size-4" />
          )}
          Calcular rota
        </Button>
      </div>

      {plan && (
        <section className="card-surface p-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={<RouteIcon className="size-4 text-primary" />}
              label="Distância"
              value={`${formatDecimal(plan.distanceKm)} km`}
            />
            <Metric
              icon={<Timer className="size-4 text-primary" />}
              label="Tempo estimado"
              value={formatDurationSeconds(plan.durationSeconds)}
            />
            <Metric
              icon={<Fuel className="size-4 text-warning" />}
              label="Combustível"
              value={`${formatDecimal(plan.fuelLiters)} L`}
            />
            <Metric
              icon={<Wallet className="size-4 text-success" />}
              label="Custo estimado"
              value={formatBRL(plan.cost)}
            />
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Base: {formatDecimal(kmpl)} km/L · {formatBRL(price)}/L
          </p>

          <div className="mt-3 h-56 overflow-hidden rounded-xl border border-border">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
                <PlanMap
                  path={plan.path}
                  origin={[plan.origin.lat, plan.origin.lng]}
                  destination={[plan.destination.lat, plan.destination.lng]}
                  current={currentPos}
                  restStops={
                    longTrip?.isLong
                      ? longTrip.rests.map((s) => ({
                          lat: s.lat,
                          lng: s.lng,
                          label: `Descanso ${s.index} · ~${formatDecimal(s.km)} km`,
                        }))
                      : []
                  }
                  refuel={
                    longTrip?.isLong && longTrip.refuel
                      ? {
                          lat: longTrip.refuel.lat,
                          lng: longTrip.refuel.lng,
                          label: `Reabastecer · ~${formatDecimal(longTrip.refuel.km)} km`,
                        }
                      : null
                  }
                />
              </Suspense>
            </ClientOnly>
          </div>

          <div className="mt-3 flex gap-2">
            {plan.monitoring ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  tripPlanStore.set({ ...plan, monitoring: false });
                  toast.message("Monitoramento de rota encerrado");
                }}
              >
                Parar monitoramento
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => {
                  tripPlanStore.set({ ...plan, monitoring: true });
                  toast.success("Monitorando desvios da rota planejada");
                }}
              >
                <Navigation className="mr-1 size-4" /> Monitorar viagem
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                tripPlanStore.set(null);
                toast.message("Plano descartado");
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {plan.monitoring && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Você será avisado se o veículo se afastar mais de 350 m do trajeto previsto.
            </p>
          )}
        </section>
      )}

      {plan && longTrip?.isLong && (
        <LongTripCard
          summary={longTrip}
          distanceKm={plan.distanceKm}
          fuelPercent={fuelPercent}
          fuelFromTelemetry={telemetryFuel != null}
          onFuelPercentChange={(v) => tripPlanStore.set({ ...plan, fuelPercent: v })}
        />
      )}
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
