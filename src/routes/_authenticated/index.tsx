import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Fuel as FuelIcon, Route as RouteIcon, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { Progress } from "@/components/ui/progress";
import { useTelemetry } from "@/hooks/useTelemetry";
import { formatKm, formatPct, formatRpm, formatSpeed } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { OngoingTripCard } from "@/components/trips/OngoingTripCard";
import { LiveConsumptionCard } from "@/components/dashboard/LiveConsumptionCard";
import { FavoritePlacesEta } from "@/components/dashboard/FavoritePlacesEta";
import { ExpiringDocsCard } from "@/components/docs/ExpiringDocsCard";
import { MaintenanceAlertsCard } from "@/components/maintenance/MaintenanceAlertsCard";
import { SafeStartCard } from "@/components/dashboard/SafeStartCard";
import { DriverHighlightCard } from "@/components/dashboard/DriverHighlightCard";
import { Bento, BentoItem } from "@/components/ui/bento";
import { BluetoothPairCard } from "@/components/dashboard/BluetoothPairCard";




export const Route = createFileRoute("/_authenticated/")({
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
  const { status, telemetry, lastMessageAt } = useTelemetry();
  const ignitionOn = telemetry.ignitionOn === true;

  // Quando desligado, força tudo em estado "off" (evita mostrar cache do último pacote).
  const speed = ignitionOn ? telemetry.speedKmh : 0;
  const rpm = ignitionOn ? telemetry.engineRpm : 0;
  const fuel = ignitionOn ? telemetry.fuelLevel : undefined;

  const { data: alerts } = useQuery({
    queryKey: ["vehicle-alerts"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { engine: false };
      const { data } = await supabase
        .from("vehicles")
        .select("alert_engine_on")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      return { engine: !!data?.alert_engine_on };
    },
  });

  const prevIgnition = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!alerts?.engine) return;
    if (
      prevIgnition.current === false &&
      telemetry.ignitionOn === true
    ) {
      toast.warning("Motor ligado", {
        description: "A ignição do veículo foi acionada.",
      });
    }
    if (telemetry.ignitionOn !== undefined) {
      prevIgnition.current = telemetry.ignitionOn;
    }
  }, [telemetry.ignitionOn, alerts?.engine]);

  const dimmed = !ignitionOn ? "opacity-60" : "";

  return (
    <AppShell title="Painel" subtitle="Telemetria em tempo real">
      <StatusHeader
        ignitionOn={telemetry.ignitionOn}
        status={status}
        lastMessageAt={lastMessageAt}
        positionValid={telemetry.positionValid}
        satellites={telemetry.satellites}
        hasFix={telemetry.latitude !== undefined && telemetry.longitude !== undefined}
      />

      <Bento>
        <BentoItem span={1}>
          <TelemetryCard
            label="Velocidade"
            value={formatSpeed(speed)}
            Icon={Gauge}
            accent="primary"
            className={dimmed}
          />
        </BentoItem>
        <BentoItem span={1}>
          <TelemetryCard
            label="RPM"
            value={formatRpm(rpm)}
            Icon={Zap}
            accent="amber"
            className={dimmed}
          />
        </BentoItem>
        <BentoItem span={2}>
          <TelemetryCard
            label="Combustível"
            value={fuel === undefined ? "—" : formatPct(fuel)}
            Icon={FuelIcon}
            accent="emerald"
            className={dimmed}
          >
            {fuel !== undefined ? (
              <Progress value={Math.max(0, Math.min(100, fuel))} className="h-2" />
            ) : (
              <p className="text-xs text-muted-foreground">Disponível com o motor ligado.</p>
            )}
          </TelemetryCard>
        </BentoItem>
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

      <BluetoothPairCard />

      {ignitionOn && <LiveConsumptionCard />}

      <SafeStartCard ignitionOn={telemetry.ignitionOn} engineRpm={telemetry.engineRpm} />

      <OngoingTripCard />

      <FavoritePlacesEta />

      <MaintenanceAlertsCard />

      <DriverHighlightCard />

      <ExpiringDocsCard />
    </AppShell>
  );
}

