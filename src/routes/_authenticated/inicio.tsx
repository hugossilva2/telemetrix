import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Route as RouteIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { GaugeCluster } from "@/components/dashboard/GaugeCluster";

import { useTelemetry } from "@/hooks/useTelemetry";
import { formatKm } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { OngoingTripCard } from "@/components/trips/OngoingTripCard";
import { LiveConsumptionCard } from "@/components/dashboard/LiveConsumptionCard";
import { FavoritePlacesEta } from "@/components/dashboard/FavoritePlacesEta";
import { ExpiringDocsCard } from "@/components/docs/ExpiringDocsCard";
import { MaintenanceAlertsCard } from "@/components/maintenance/MaintenanceAlertsCard";
import { VehicleHealthCard } from "@/components/health/VehicleHealthCard";
import { SafeStartCard } from "@/components/dashboard/SafeStartCard";
import { DriverHighlightCard } from "@/components/dashboard/DriverHighlightCard";
import { Bento, BentoItem } from "@/components/ui/bento";
import { BluetoothPairCard } from "@/components/dashboard/BluetoothPairCard";
import { useOpenTrip } from "@/lib/trips/store";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActiveVehicle } from "@/lib/vehicles/active";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Painel · Telemetrix" },
      { name: "description", content: "Telemetria ao vivo do veículo via Flespi MQTT." },
      { property: "og:title", content: "Painel · Telemetrix" },
      { property: "og:description", content: "Telemetria ao vivo do veículo via Flespi MQTT." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { vehicle: activeVehicle } = useActiveVehicle();
  const { status, telemetry, lastMessageAt } = useTelemetry();
  const ignitionOn = telemetry.ignitionOn === true;

  // Quando desligado, força tudo em estado "off" (evita mostrar cache do último pacote).
  const speed = ignitionOn ? telemetry.speedKmh : 0;
  const rpm = ignitionOn ? telemetry.engineRpm : 0;
  const fuel = ignitionOn ? telemetry.fuelLevel : undefined;

  const alerts = { engine: !!activeVehicle?.alert_engine_on };

  const prevIgnition = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!alerts?.engine) return;
    if (prevIgnition.current === false && telemetry.ignitionOn === true) {
      toast.warning("Motor ligado", {
        description: "A ignição do veículo foi acionada.",
      });
    }
    if (telemetry.ignitionOn !== undefined) {
      prevIgnition.current = telemetry.ignitionOn;
    }
  }, [telemetry.ignitionOn, alerts?.engine]);

  const dimmed = !ignitionOn ? "opacity-60" : "";

  // Modo viagem: motor ligado + viagem em andamento => painel focado no tempo real.
  const openTrip = useOpenTrip();
  const tripMode = ignitionOn && openTrip !== null;
  const [showAll, setShowAll] = useState(false);
  const showSecondary = !tripMode || showAll;

  // Ao encerrar a viagem, volta ao painel completo automaticamente.
  useEffect(() => {
    if (!tripMode) setShowAll(false);
  }, [tripMode]);

  return (
    <AppShell
      title="Painel"
      subtitle={tripMode ? "Viagem em andamento · tempo real" : "Telemetria em tempo real"}
    >
      <StatusHeader
        ignitionOn={telemetry.ignitionOn}
        status={status}
        lastMessageAt={lastMessageAt}
        positionValid={telemetry.positionValid}
        satellites={telemetry.satellites}
        hasFix={telemetry.latitude !== undefined && telemetry.longitude !== undefined}
      />

      <GaugeCluster
        speedKmh={telemetry.canSpeedKmh ?? speed}
        rpm={rpm}
        fuelPct={fuel}
        tankLiters={activeVehicle?.tank_l ?? null}
        ecoRpmMin={activeVehicle?.eco_rpm_min ?? null}
        ecoRpmMax={activeVehicle?.eco_rpm_max ?? null}
        ignitionOn={ignitionOn}
      />

      <AutonomyCard />


      <Bento>

        <BentoItem span={1}>
          <TelemetryCard
            label="Odômetro"
            value={formatKm(telemetry.mileageKm)}
            Icon={RouteIcon}
            accent="sky"
          />
        </BentoItem>
        <BentoItem span={1}>
          <TelemetryCard
            label="Status"
            value={ignitionOn ? "Em uso" : "Parado"}
            Icon={Gauge}
            accent={ignitionOn ? "emerald" : "sky"}
          />
        </BentoItem>
      </Bento>

      {ignitionOn && <LiveConsumptionCard />}

      <OngoingTripCard />

      <FavoritePlacesEta />

      {tripMode && (
        <div className="mt-1 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? (
              <>
                <ChevronUp className="size-3.5" /> Focar na viagem
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" /> Ver tudo
              </>
            )}
          </Button>
        </div>
      )}

      {showSecondary && (
        <>
          <BluetoothPairCard />

          <SafeStartCard ignitionOn={telemetry.ignitionOn} engineRpm={telemetry.engineRpm} />

          <VehicleHealthCard />

          <MaintenanceAlertsCard />

          <DriverHighlightCard />

          <ExpiringDocsCard />
        </>
      )}
    </AppShell>
  );
}
