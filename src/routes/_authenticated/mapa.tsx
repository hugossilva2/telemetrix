import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import type { TrailPoint } from "@/components/map/VehicleMap";

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · Gestão Veicular" },
      { name: "description", content: "Localização do veículo em tempo real, rota percorrida e status." },
      { property: "og:title", content: "Mapa · Gestão Veicular" },
      { property: "og:description", content: "Acompanhe a posição do veículo em tempo real." },
    ],
  }),
  component: MapaPage,
});

// Haversine em km
function haversineKm(a: TrailPoint, b: TrailPoint) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function MapaPage() {
  const { telemetry, status, lastMessageAt } = useFlespiMqtt();
  const lat = telemetry.latitude;
  const lng = telemetry.longitude;
  const ignition = telemetry.ignitionOn;

  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const lastPointRef = useRef<TrailPoint | null>(null);
  const prevIgnitionRef = useRef<boolean | undefined>(undefined);

  // Reset trail on ignition OFF -> ON (nova viagem)
  useEffect(() => {
    if (prevIgnitionRef.current === false && ignition === true) {
      setTrail([]);
      setDistance(0);
      lastPointRef.current = null;
    }
    prevIgnitionRef.current = ignition;
  }, [ignition]);

  // Acumula pontos do rastro
  useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const pt: TrailPoint = [lat, lng];
    const last = lastPointRef.current;
    if (last) {
      const d = haversineKm(last, pt);
      // Filtra ruído GPS: só adiciona se mover mais de 5 metros
      if (d < 0.005) return;
      setDistance((prev) => prev + d);
    }
    lastPointRef.current = pt;
    setTrail((prev) => (prev.length > 500 ? [...prev.slice(-499), pt] : [...prev, pt]));
  }, [lat, lng]);

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
      <div className="h-[calc(100vh-200px)] min-h-[420px] overflow-hidden rounded-2xl border border-border">
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
            />
          </Suspense>
        </ClientOnly>
      </div>
    </AppShell>
  );
}
