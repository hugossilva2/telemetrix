import { Bluetooth, Cloud, Radio } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTelemetrySource } from "@/lib/telemetry/source";
import { useTelemetry } from "@/hooks/useTelemetry";
import { Button } from "@/components/ui/button";
import type { TelemetrySource } from "@/lib/telemetry/types";

const OPTIONS: {
  value: TelemetrySource;
  title: string;
  description: string;
  Icon: typeof Cloud;
}[] = [
  {
    value: "fmc003",
    title: "Equipamento dedicado (nuvem)",
    description: "Teltonika FMC003 via Flespi. Funciona mesmo com o app fechado.",
    Icon: Cloud,
  },
  {
    value: "elm327",
    title: "Adaptador OBD-II (Bluetooth local)",
    description: "ELM327 pareado com o celular + GPS do aparelho. Só grava com o app aberto.",
    Icon: Bluetooth,
  },
];

export function DataSourceCard() {
  const { source, setSource } = useTelemetrySource();
  const { status, deviceName, supported, disconnect, savedDevice, forgetDevice } = useTelemetry();


  return (
    <section className="card-surface p-4">
      <header className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Radio className="size-4 text-primary" />
        Fonte de dados
      </header>

      <RadioGroup
        value={source}
        onValueChange={(v) => setSource(v as TelemetrySource)}
        className="gap-2"
      >
        {OPTIONS.map(({ value, title, description, Icon }) => {
          const active = source === value;
          return (
            <Label
              key={value}
              htmlFor={`src-${value}`}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                active
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/70 hover:border-border"
              }`}
            >
              <RadioGroupItem value={value} id={`src-${value}`} className="mt-1" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-primary" />
                  {title}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {description}
                </span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>

      {source === "elm327" && (
        <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-background/35 px-3 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              {deviceName ? `Pareado: ${deviceName}` : "Nenhum adaptador conectado"}
            </span>
            <Badge variant={status === "connected" ? "default" : "secondary"} className="shrink-0">
              {status === "connected" ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          {supported === false && (
            <p className="text-warning">
              Este navegador não suporta Web Bluetooth. Use o Chrome no Android, com o app aberto
              em uma aba (não dentro do preview).
            </p>
          )}
          {status === "connected" && disconnect && (
            <Button type="button" size="sm" variant="outline" onClick={disconnect}>
              Desconectar
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
