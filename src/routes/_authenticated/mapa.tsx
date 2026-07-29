import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useTelemetry } from "@/hooks/useTelemetry";
import type { SpeedSample } from "@/components/map/SpeedPolyline";

type TrailPoint = SpeedSample;

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · Telemetrix" },
      { name: "description", content: "Localização do veículo em tempo real, rota percorrida e status." },
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
      <div className="h-[calc(100dvh-11rem)] min-h-[420px] overflow-hidden rounded-2xl border border-border">
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
            />
          </Suspense>
        </ClientOnly>
      </div>
    </AppShell>
  );
}
