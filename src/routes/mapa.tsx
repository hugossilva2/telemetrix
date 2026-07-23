import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · Gestão Veicular" },
      { name: "description", content: "Localização do veículo em tempo real no mapa." },
      { property: "og:title", content: "Mapa · Gestão Veicular" },
      { property: "og:description", content: "Acompanhe a posição do veículo em tempo real." },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  const { telemetry, status } = useFlespiMqtt();
  const lat = telemetry.latitude;
  const lng = telemetry.longitude;

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
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
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
              ignition={telemetry.ignitionOn}
            />
          </Suspense>
        </ClientOnly>
      </div>
    </AppShell>
  );
}
