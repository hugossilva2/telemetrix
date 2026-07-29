import { useState } from "react";
import { Activity, CheckCircle2, RadioTower, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlespiRawKeys } from "@/hooks/useFlespiRawKeys";

/** Chaves que precisamos ver para o Green Driving nativo funcionar. */
const WANTED: { key: string; label: string }[] = [
  { key: "green.driving.type", label: "Green Driving Type" },
  { key: "green.driving.value", label: "Green Driving Value" },
  { key: "accelerometer.axis.x", label: "Acelerômetro X" },
  { key: "accelerometer.axis.y", label: "Acelerômetro Y" },
  { key: "accelerometer.axis.z", label: "Acelerômetro Z" },
  { key: "can.engine.rpm", label: "RPM do motor" },
  { key: "can.vehicle.speed", label: "Velocidade CAN" },
];

export function TelemetryDiagnosticsCard() {
  const [listening, setListening] = useState(false);
  const { keys, messageCount, lastMessageAt, connected } = useFlespiRawKeys(listening);
  const present = new Set(keys.map((k) => k.key));

  return (
    <section className="mt-3 space-y-3 card-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <RadioTower className="size-4" /> Diagnóstico do rastreador
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Escuta o MQTT ao vivo e mostra quais dados o aparelho está enviando.
          </p>
        </div>
        <Button
          size="sm"
          variant={listening ? "outline" : "default"}
          onClick={() => setListening((v) => !v)}
        >
          {listening ? "Parar" : "Ouvir"}
        </Button>
      </div>

      {listening && (
        <p className="text-[11px] text-muted-foreground">
          {connected ? "Conectado" : "Conectando…"} · {messageCount} mensagem(ns)
          {lastMessageAt
            ? ` · última ${new Date(lastMessageAt).toLocaleTimeString("pt-BR")}`
            : " · aguardando dados (ligue o carro e acelere)"}
        </p>
      )}

      <ul className="space-y-1.5">
        {WANTED.map((w) => {
          const entry = keys.find((k) => k.key === w.key);
          const ok = present.has(w.key);
          return (
            <li
              key={w.key}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs">
                {ok ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{w.label}</span>
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {entry ? entry.value : "—"}
              </span>
            </li>
          );
        })}
      </ul>

      {keys.length > 0 && (
        <details className="rounded-xl border border-border/60 p-3">
          <summary className="cursor-pointer text-xs font-medium">
            <Activity className="mr-1 inline size-3.5" />
            Todas as chaves recebidas ({keys.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {keys.map((k) => (
              <li key={k.key} className="flex justify-between gap-2 text-[11px]">
                <span className="truncate text-muted-foreground">{k.key}</span>
                <span className="shrink-0 tabular-nums">{k.value}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
