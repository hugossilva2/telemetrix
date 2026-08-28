import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Clock,
  RadioTower,
  RefreshCw,
  Satellite,
  Server,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { getDiagnostics } from "@/lib/diagnostics/status.functions";
import {
  SIGNAL_HEALTH_CLASS,
  SIGNAL_HEALTH_LABEL,
  SIGNAL_LOST_CAUSES,
  signalHealth,
  signalLostReason,
} from "@/lib/tracker/signalLost";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico da conexão · Telemetrix" },
      {
        name: "description",
        content:
          "Estado do MQTT, horário original da última mensagem do rastreador, latência da telemetria e motivo do alerta de sinal perdido.",
      },
      { property: "og:title", content: "Diagnóstico da conexão · Telemetrix" },
      {
        property: "og:description",
        content: "Veja se o problema é o app, a internet ou o rastreador do carro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagnosticoPage,
});

const STATUS_LABEL: Record<string, string> = {
  idle: "Aguardando",
  connecting: "Conectando",
  connected: "Conectado",
  reconnecting: "Reconectando",
  offline: "Offline",
  error: "Erro",
};

const STATUS_CLASS: Record<string, string> = {
  idle: "border-border bg-muted/40 text-muted-foreground",
  connecting: "border-warning/40 bg-warning/10 text-warning",
  connected: "border-success/40 bg-success/10 text-success",
  reconnecting: "border-warning/40 bg-warning/10 text-warning",
  offline: "border-destructive/40 bg-destructive/10 text-destructive",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtAge(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">
        <span className="num block text-xs font-medium">{value}</span>
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

function DiagnosticoPage() {
  const { status, telemetry, lastMessageAt, error, source } = useTelemetry();
  const { vehicleId, vehicle } = useActiveVehicle();
  const fetchDiagnostics = useServerFn(getDiagnostics);

  // Relógio local para as idades ficarem vivas sem depender de novas mensagens.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["diagnostics", vehicleId],
    refetchInterval: 30_000,
    queryFn: () => fetchDiagnostics({ data: { vehicleId: vehicleId ?? null } }),
  });

  // Horário ORIGINAL da mensagem (relógio do rastreador), em epoch ms.
  const originalMs =
    typeof telemetry.timestamp === "number" && Number.isFinite(telemetry.timestamp)
      ? telemetry.timestamp * 1000
      : null;
  // Latência de transporte: quando recebemos menos quando o dado foi gerado.
  const transportMs =
    originalMs != null && lastMessageAt != null ? lastMessageAt - originalMs : null;

  const serverLastMs = data?.state?.lastMessageAt
    ? Date.parse(data.state.lastMessageAt)
    : null;
  const health = signalHealth({
    lastMessageMs: serverLastMs ?? originalMs,
    nowMs: now,
    ignitionOn: data?.state?.ignitionOn ?? telemetry.ignitionOn ?? null,
  });

  return (
    <AppShell title="Diagnóstico" subtitle="Conexão, latência e sinal do rastreador">
      <div className="space-y-4">
        <section className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="size-4" /> Conexão em tempo real
            </p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                STATUS_CLASS[status] ?? STATUS_CLASS["idle"],
              )}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          <div className="mt-3">
            <Row
              label="Origem dos dados"
              value={source === "obd" ? "Adaptador OBD-II (Bluetooth)" : "Nuvem Flespi (MQTT)"}
            />
            <Row
              label="Última mensagem recebida no app"
              value={lastMessageAt ? fmtAge(now - lastMessageAt) : "—"}
              hint={lastMessageAt ? fmtDateTime(new Date(lastMessageAt).toISOString()) : null}
            />
            <Row
              label="Horário original da mensagem"
              value={originalMs ? fmtDateTime(new Date(originalMs).toISOString()) : "—"}
              hint={originalMs ? `relógio do rastreador · ${fmtAge(now - originalMs)} atrás` : "o aparelho não enviou timestamp"}
            />
            <Row
              label="Latência até o app"
              value={transportMs != null ? fmtAge(Math.abs(transportMs)) : "—"}
              hint={
                transportMs != null && transportMs < 0
                  ? "relógio do rastreador adiantado"
                  : "entre gerar o dado e chegar aqui"
              }
            />
            <Row label="Motor" value={telemetry.ignitionOn === true ? "Ligado" : telemetry.ignitionOn === false ? "Desligado" : "—"} />
            <Row
              label="GPS"
              value={
                telemetry.positionValid === true
                  ? `Com fix${telemetry.satellites != null ? ` · ${telemetry.satellites} sat.` : ""}`
                  : telemetry.positionValid === false
                    ? "Sem fix"
                    : "—"
              }
            />
            <Row
              label="Sinal GSM"
              value={telemetry.gsmSignal != null ? `${telemetry.gsmSignal}%` : "—"}
            />
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              {error}
            </p>
          )}
        </section>

        <section className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Server className="size-4" /> Ingestão no servidor
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-1 size-3", isFetching && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          <div className="mt-2">
            <span
              className={cn(
                "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                SIGNAL_HEALTH_CLASS[health.health],
              )}
            >
              {SIGNAL_HEALTH_LABEL[health.health]} · limite {health.thresholdMin} min
            </span>
          </div>

          <div className="mt-3">
            <Row
              label="Veículo"
              value={data?.vehicle?.name ?? vehicle?.name ?? "—"}
              hint={data?.vehicle?.deviceId ? `device ${data.vehicle.deviceId}` : "sem rastreador vinculado"}
            />
            <Row
              label="Última mensagem gravada"
              value={fmtDateTime(data?.state?.lastMessageAt ?? null)}
              hint={serverLastMs ? `${fmtAge(now - serverLastMs)} atrás` : null}
            />
            <Row
              label="Último ponto do traçado"
              value={fmtDateTime(data?.state?.lastPingAt ?? data?.lastPing?.recordedAt ?? null)}
              hint={
                data?.lastPing
                  ? `${data.lastPing.lat.toFixed(5)}, ${data.lastPing.lng.toFixed(5)}`
                  : null
              }
            />
            <Row label="Pontos na última hora" value={String(data?.pingsLastHour ?? 0)} />
            <Row
              label="Última viagem encerrada"
              value={fmtDateTime(data?.lastTripEndedAt ?? null)}
            />
            <Row
              label="Alerta de sinal perdido ativo"
              value={data?.signalLostNotifiedAt ? "Sim" : "Não"}
              hint={data?.signalLostNotifiedAt ? fmtDateTime(data.signalLostNotifiedAt) : null}
            />
          </div>
        </section>

        <section className="card-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4" /> Último alerta de sinal perdido
          </p>
          {data?.lastSignalLost ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {fmtDateTime(data.lastSignalLost.occurredAt)}
              </p>
              <p className="mt-1 text-xs">{signalLostReason(data.lastSignalLost.metadata)}</p>
              <div className="mt-3">
                <p className="text-[11px] font-medium text-muted-foreground">Causas prováveis</p>
                <ul className="mt-1 space-y-1">
                  {SIGNAL_LOST_CAUSES.map((c) => (
                    <li key={c} className="flex gap-2 text-[11px] text-muted-foreground">
                      <Satellite className="mt-0.5 size-3 shrink-0 text-primary" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum alerta de sinal perdido registrado para este veículo.
            </p>
          )}
        </section>

        <p className="flex items-start gap-2 px-1 text-[11px] text-muted-foreground">
          <Activity className="mt-0.5 size-3.5 shrink-0" />
          Se a conexão está "Conectado" mas a última mensagem gravada é antiga, o problema está no
          rastreador do carro (energia, chip ou cobertura) — não no app.
        </p>
      </div>
    </AppShell>
  );
}
