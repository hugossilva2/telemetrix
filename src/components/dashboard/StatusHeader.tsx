import { useEffect, useState } from "react";
import { Bluetooth, Cloud, Power, PowerOff, Satellite, SatelliteDish } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MqttStatus } from "@/lib/flespi/types";
import { useTelemetry } from "@/hooks/useTelemetry";
import { SOURCE_SHORT } from "@/lib/telemetry/types";



interface Props {
  ignitionOn?: boolean;
  status: MqttStatus;
  lastMessageAt: number | null;
  positionValid?: boolean;
  satellites?: number;
  hasFix?: boolean;
}


const statusText: Record<MqttStatus, string> = {
  idle: "Iniciando",
  connecting: "Conectando",
  connected: "Ao vivo",
  reconnecting: "Reconectando",
  offline: "Offline",
  error: "Erro",
};

const statusDot: Record<MqttStatus, string> = {
  idle: "bg-muted-foreground",
  connecting: "bg-warning animate-pulse",
  connected: "bg-primary animate-pulse",
  reconnecting: "bg-warning animate-pulse",
  offline: "bg-muted-foreground",
  error: "bg-destructive",
};


function timeAgo(ts: number | null): string {
  if (!ts) return "aguardando dados";
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 5) return "agora";
  if (secs < 60) return `há ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  return `há ${h}h`;
}

export function StatusHeader({
  ignitionOn,
  status,
  lastMessageAt,
  positionValid,
  satellites,
  hasFix,
}: Props) {
  const on = ignitionOn === true;
  const known = ignitionOn !== undefined;
  const { source } = useTelemetry();
  const SourceIcon = source === "elm327" ? Bluetooth : Cloud;


  // Tick a cada 1s para o "há Xs" andar mesmo sem mensagem nova.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const secsSince =
    lastMessageAt != null
      ? Math.max(0, Math.floor((Date.now() - lastMessageAt) / 1000))
      : null;
  // Telemetria chega a cada ~15s; acima de 30s consideramos sinal atrasado.
  const stale = secsSince != null && secsSince > 30;

  return (
    <div className={`card-surface p-4 ${on ? "card-glow" : ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
              on
                ? "bg-primary/15 text-primary shadow-[0_0_24px_-8px_var(--primary)]"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {on ? <Power className="size-5" /> : <PowerOff className="size-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Motor
            </div>
            <div className="font-display truncate text-lg font-semibold">
              {!known ? "—" : on ? "Ligado" : "Desligado"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="gap-1 border-border/70">
            <SourceIcon className="size-3" />
            {SOURCE_SHORT[source]}
          </Badge>
          <Badge variant={on ? "default" : "secondary"} className="shrink-0">
            {on ? "ON" : known ? "OFF" : "…"}
          </Badge>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-background/35 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`inline-block size-2 shrink-0 rounded-full ${
              stale && status === "connected" ? "bg-warning animate-pulse" : statusDot[status]
            }`}
          />
          <span className="truncate">
            {stale && status === "connected" ? "Sinal atrasado" : statusText[status]}
          </span>
          <span aria-hidden>•</span>
          <span className="shrink-0">{timeAgo(lastMessageAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hasFix ? (
            <SatelliteDish className="size-3.5 shrink-0 text-primary" />
          ) : (
            <Satellite className="size-3.5 shrink-0 text-warning" />
          )}
          <span className="truncate">
            {hasFix
              ? "GPS com sinal"
              : positionValid === false || satellites === 0
                ? "GPS sem fix — sem satélites"
                : "GPS aguardando posição"}
          </span>
          {satellites !== undefined && (
            <>
              <span aria-hidden>•</span>
              <span className="num shrink-0">{satellites} sat.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


