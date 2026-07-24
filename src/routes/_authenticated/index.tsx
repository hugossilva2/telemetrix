import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Fuel as FuelIcon, Battery, Route as RouteIcon, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { Progress } from "@/components/ui/progress";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { formatKm, formatPct, formatRpm, formatSpeed, formatVolts } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { OngoingTripBanner } from "@/components/trips/OngoingTripBanner";
import { LiveConsumptionCard } from "@/components/dashboard/LiveConsumptionCard";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel · Gestão Veicular" },
      { name: "description", content: "Telemetria ao vivo do veículo via Flespi MQTT." },
      { property: "og:title", content: "Painel · Gestão Veicular" },
      { property: "og:description", content: "Telemetria ao vivo do veículo via Flespi MQTT." },
    ],
  }),
  component: Dashboard,
});

const LOW_BATTERY_V = 11.8;

function Dashboard() {
  const { status, telemetry, lastMessageAt } = useFlespiMqtt();
  const fuel = telemetry.fuelLevel;

  const { data: alerts } = useQuery({
    queryKey: ["vehicle-alerts"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { engine: false, battery: false };
      const { data } = await supabase
        .from("vehicles")
        .select("alert_engine_on,alert_low_battery")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      return {
        engine: !!data?.alert_engine_on,
        battery: !!data?.alert_low_battery,
      };
    },
  });

  const prevIgnition = useRef<boolean | undefined>(undefined);
  const lowBatteryNotified = useRef(false);

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

  useEffect(() => {
    if (!alerts?.battery) return;
    const v = telemetry.batteryVoltage;
    if (v === undefined) return;
    if (v < LOW_BATTERY_V && !lowBatteryNotified.current) {
      lowBatteryNotified.current = true;
      toast.error("Bateria baixa", {
        description: `Tensão em ${v.toFixed(2)} V.`,
      });
    } else if (v >= LOW_BATTERY_V + 0.3) {
      lowBatteryNotified.current = false;
    }
  }, [telemetry.batteryVoltage, alerts?.battery]);



  return (
    <AppShell title="Painel" subtitle="Telemetria em tempo real">
      <StatusHeader
        ignitionOn={telemetry.ignitionOn}
        status={status}
        lastMessageAt={lastMessageAt}
      />

      <OngoingTripBanner />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <TelemetryCard label="Velocidade" value={formatSpeed(telemetry.speedKmh)} Icon={Gauge} accent="primary" />
        <TelemetryCard label="Odômetro" value={formatKm(telemetry.mileageKm)} Icon={RouteIcon} accent="sky" />
        <TelemetryCard
          label="Combustível"
          value={fuel === undefined ? "—" : formatPct(fuel)}
          Icon={FuelIcon}
          accent="emerald"
        >
          {fuel !== undefined ? (
            <Progress value={Math.max(0, Math.min(100, fuel))} className="h-2" />
          ) : (
            <p className="text-xs text-muted-foreground">Disponível com o motor ligado.</p>
          )}
        </TelemetryCard>
        <TelemetryCard label="RPM" value={formatRpm(telemetry.engineRpm)} Icon={Zap} accent="amber" />
        <div className="col-span-2">
          <TelemetryCard label="Bateria" value={formatVolts(telemetry.batteryVoltage)} Icon={Battery} accent="emerald" />
        </div>
        <LiveConsumptionCard />
      </div>
    </AppShell>
  );
}
