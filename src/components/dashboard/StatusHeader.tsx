import { Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MqttStatus } from "@/lib/flespi/types";

interface Props {
  ignitionOn?: boolean;
  status: MqttStatus;
  lastMessageAt: number | null;
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
  connecting: "bg-yellow-500 animate-pulse",
  connected: "bg-emerald-500 animate-pulse",
  reconnecting: "bg-yellow-500 animate-pulse",
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

export function StatusHeader({ ignitionOn, status, lastMessageAt }: Props) {
  const on = ignitionOn === true;
  const known = ignitionOn !== undefined;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-11 place-items-center rounded-full ${
              on ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
            }`}
          >
            {on ? <Power className="size-5" /> : <PowerOff className="size-5" />}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Motor</div>
            <div className="text-base font-semibold">
              {!known ? "—" : on ? "Ligado" : "Desligado"}
            </div>
          </div>
        </div>
        <Badge variant={on ? "default" : "secondary"} className={on ? "bg-emerald-500 hover:bg-emerald-500" : ""}>
          {on ? "ON" : known ? "OFF" : "…"}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-block size-2 rounded-full ${statusDot[status]}`} />
        <span>{statusText[status]}</span>
        <span aria-hidden>•</span>
        <span>{timeAgo(lastMessageAt)}</span>
      </div>
    </div>
  );
}
