import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { AppShell } from "@/components/layout/AppShell";
import { useTelemetry } from "@/hooks/useTelemetry";
import type { SpeedSample } from "@/components/map/SpeedPolyline";
import { DestinationSearch, type DestinationPick } from "@/components/map/DestinationSearch";
import { RoutePanel } from "@/components/map/RoutePanel";
import type { PlannedRoute } from "@/components/map/PlannedRouteLayer";
import { planRoute } from "@/lib/trips/planRoute.functions";
import { decodePolyline, tripPlanStore } from "@/lib/trips/plan";
import { tripDestinationStore, useTripDestination } from "@/lib/trips/activeDestination";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";

type TrailPoint = SpeedSample;

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · Telemetrix" },
      {
        name: "description",
        content: "Localização do veículo em tempo real, rota percorrida e status.",
      },
      { property: "og:title", content: "Mapa · Telemetrix" },
      { property: "og:description", content: "Acompanhe a posição do veículo em tempo real." },
    ],
  }),
  component: MapaPage,
});

import { haversineKm as haversine } from "@/lib/trips/geo";
function haversineKm(a: TrailPoint, b: TrailPoint) {
  return haversine(a.lat, a.lng, b.lat, b.lng);
}

import { useParkedSpot } from "@/lib/tracker/parked";

function MapaPage() {
  const { telemetry, status, lastMessageAt } = useTelemetry();
  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const ignition = telemetry.ignitionOn;
  const mileage = telemetry.mileageKm;

  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [mileageStart, setMileageStart] = useState<number | null>(null);
  const [mileageNow, setMileageNow] = useState<number | null>(null);
  const parked = useParkedSpot(lat, lng, ignition);
  const lastPointRef = useRef<TrailPoint | null>(null);
  const prevIgnitionRef = useRef<boolean | undefined>(undefined);
  const lastKnownPosRef = useRef<TrailPoint | null>(null);

  // Roteirização (destino estilo Uber)
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const destination = useTripDestination();
  const started =
    !!route &&
    [destination.active, destination.pending].some(
      (d) =>
        !!d &&
        Math.abs(d.lat - route.destination.lat) < 1e-5 &&
        Math.abs(d.lng - route.destination.lng) < 1e-5,
    );

  // Reset trail on ignition OFF -> ON (nova viagem).
  useEffect(() => {
    const prev = prevIgnitionRef.current;
    if (prev === false && ignition === true) {
      setTrail([]);
      setGpsDistance(0);
      setMileageStart(typeof mileage === "number" ? mileage : null);
      setMileageNow(typeof mileage === "number" ? mileage : null);
      lastPointRef.current = null;
    }
    prevIgnitionRef.current = ignition;
  }, [ignition, mileage]);

  // Acumula pontos do rastro + odômetro atual
  useEffect(() => {
    if (typeof mileage === "number") {
      setMileageNow(mileage);
      if (mileageStart === null && ignition === true) setMileageStart(mileage);
    }
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const pt: TrailPoint = { lat, lng, speed: telemetry.speedKmh ?? null, t: Date.now() };
    lastKnownPosRef.current = pt;
    const last = lastPointRef.current;
    if (last) {
      const d = haversineKm(last, pt);
      // Filtra ruído GPS: só adiciona se mover mais de 5 metros
      if (d < 0.005) return;
      setGpsDistance((prev) => prev + d);
    }
    lastPointRef.current = pt;
    setTrail((prev) => (prev.length > 500 ? [...prev.slice(-499), pt] : [...prev, pt]));
  }, [lat, lng, mileage, ignition, mileageStart]);

  // Distância: prefere delta de odômetro (mais preciso que Haversine com amostras a 15s).
  const distance =
    mileageStart !== null && mileageNow !== null && mileageNow >= mileageStart
      ? mileageNow - mileageStart
      : gpsDistance;

  const handlePick = useCallback(
    async (dest: DestinationPick) => {
      const origin =
        lastKnownPosRef.current ??
        (typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null);
      if (!origin) {
        toast.error("Sem posição atual", {
          description: "Aguarde o GPS para traçar a rota.",
        });
        return;
      }
      setRouting(true);
      try {
        const res = await planRoute({
          data: {
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: dest.lat, lng: dest.lng },
          },
        });
        setRoute({
          path: decodePolyline(res.encodedPolyline),
          distanceMeters: res.distanceMeters,
          durationSeconds: res.durationSeconds,
          destination: {
            name: dest.name,
            address: dest.address,
            lat: dest.lat,
            lng: dest.lng,
          },
        });
      } catch (err) {
        toast.error("Não foi possível traçar a rota", {
          description: toUserMessage(err, "Verifique o destino e tente de novo."),
        });
      } finally {
        setRouting(false);
      }
    },
    [lat, lng],
  );

  const handleStart = useCallback(() => {
    if (!route) return;
    const dest = {
      placeId: `map:${route.destination.lat.toFixed(5)},${route.destination.lng.toFixed(5)}`,
      name: route.destination.name,
      icon: null,
      lat: route.destination.lat,
      lng: route.destination.lng,
      radiusM: 150,
      startedAt: new Date().toISOString(),
    };
    const origin = lastKnownPosRef.current;
    if (origin) {
      const distanceKm = route.distanceMeters / 1000;
      tripPlanStore.set({
        createdAt: new Date().toISOString(),
        origin: { placeId: "origin", name: "Posição atual", lat: origin.lat, lng: origin.lng },
        stops: [],
        destination: {
          placeId: dest.placeId,
          name: route.destination.name,
          address: route.destination.address,
          lat: route.destination.lat,
          lng: route.destination.lng,
        },
        distanceKm,
        durationSeconds: route.durationSeconds,
        fuelLiters: distanceKm / 10,
        cost: (distanceKm / 10) * DEFAULT_GAS_PRICE_PER_LITER,
        path: route.path,
        monitoring: true,
      });
    }
    if (ignition === true) {
      tripDestinationStore.setActive(dest);
      toast.success(`Viagem iniciada — monitorando até ${dest.name}`);
    } else {
      tripDestinationStore.setPending(dest);
      toast.message("Motor desligado", {
        description: `A viagem para ${dest.name} começará ao ligar o carro.`,
      });
    }
  }, [route, ignition]);

  const handleCancel = useCallback(() => {
    setRoute(null);
    tripDestinationStore.clearAll();
    tripPlanStore.set(null);
  }, []);

  const fallback = (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  );

  return (
    <AppShell
      title="Mapa"
      subtitle={
        lat != null && lng != null
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)} · rota ${distance.toFixed(2)} km`
          : status === "connected"
            ? "Aguardando posição…"
            : "Sem conexão"
      }
    >
      <div className="relative h-[calc(100dvh-11rem)] min-h-[420px] overflow-hidden rounded-2xl border border-border">
        <ClientOnly fallback={fallback}>
          <Suspense fallback={fallback}>
            <VehicleMap
              lat={lat}
              lng={lng}
              speed={telemetry.speedKmh}
              ignition={ignition}
              trail={trail}
              distanceKm={distance}
              lastUpdate={lastMessageAt}
              status={status}
              parked={parked}
              plannedRoute={route}
            />
          </Suspense>
        </ClientOnly>

        {/* Busca de destino sobreposta ao mapa */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[600] space-y-2">
          {route ? (
            <div className="pointer-events-auto">
              <RoutePanel
                route={route}
                started={started}
                ignitionOn={ignition === true}
                onStart={handleStart}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <div className="pointer-events-auto">
              <DestinationSearch
                bias={typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null}
                onPick={handlePick}
                placeholder={routing ? "Calculando rota…" : "Para onde vamos?"}
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
