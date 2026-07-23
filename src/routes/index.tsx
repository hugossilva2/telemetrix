import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Fuel as FuelIcon, Battery, Route as RouteIcon, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { Progress } from "@/components/ui/progress";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { formatKm, formatPct, formatRpm, formatSpeed, formatVolts } from "@/lib/format";

export const Route = createFileRoute("/")({
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

function Dashboard() {
  const { status, telemetry, lastMessageAt } = useFlespiMqtt();
  const fuel = telemetry.fuelLevel;

  return (
    <AppShell title="Painel" subtitle="Telemetria em tempo real">
      <StatusHeader
        ignitionOn={telemetry.ignitionOn}
        status={status}
        lastMessageAt={lastMessageAt}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <TelemetryCard
          label="Velocidade"
          value={formatSpeed(telemetry.speedKmh)}
          Icon={Gauge}
          accent="primary"
        />
        <TelemetryCard
          label="Odômetro"
          value={formatKm(telemetry.mileageKm)}
          Icon={RouteIcon}
          accent="sky"
        />
        <TelemetryCard
          label="Combustível"
          value={fuel === undefined ? "—" : formatPct(fuel)}
          Icon={FuelIcon}
          accent="emerald"
        >
          {fuel !== undefined ? (
            <Progress value={Math.max(0, Math.min(100, fuel))} className="h-2" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Disponível com o motor ligado.
            </p>
          )}
        </TelemetryCard>
        <TelemetryCard
          label="RPM"
          value={formatRpm(telemetry.engineRpm)}
          Icon={Zap}
          accent="amber"
        />
        <div className="col-span-2">
          <TelemetryCard
            label="Bateria"
            value={formatVolts(telemetry.batteryVoltage)}
            Icon={Battery}
            accent="emerald"
          />
        </div>
      </div>
    </AppShell>
  );
}
