import { useState } from "react";
import { Bluetooth, BluetoothConnected } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/hooks/useTelemetry";

/**
 * Card de pareamento do modo Econômico. O modal nativo do navegador só abre a
 * partir de um clique do usuário, por isso o botão vive no Painel.
 */
export function BluetoothPairCard() {
  const { source, status, connect, supported, deviceName, savedDevice, error } = useTelemetry();
  const [busy, setBusy] = useState(false);

  if (source !== "elm327" || status === "connected") return null;

  const firstTime = !savedDevice;
  const knownName = savedDevice?.name ?? deviceName;

  async function handleConnect() {
    if (!connect) return;
    setBusy(true);
    try {
      await connect();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface mt-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          {knownName ? <BluetoothConnected className="size-5" /> : <Bluetooth className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">
            {firstTime ? "Parear adaptador OBD-II" : `Reconectar a ${knownName ?? "adaptador"}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {supported === false
              ? "Web Bluetooth indisponível neste navegador. Abra o app no Chrome do Android."
              : firstTime
                ? "Primeiro pareamento: vamos memorizar o adaptador para as próximas viagens."
                : "Adaptador já memorizado. Toque para retomar a leitura de RPM, velocidade e combustível."}
          </p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {firstTime && supported !== false && (
        <ol className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-background/35 px-3 py-2.5 text-xs text-muted-foreground">
          <li>1. Plugue o ELM327 na porta OBD-II do carro e ligue a ignição.</li>
          <li>2. Ative o Bluetooth do celular e use o Chrome no Android.</li>
          <li>3. Toque em “Parear Bluetooth” e escolha o adaptador na lista do navegador.</li>
        </ol>
      )}

      <Button
        className="mt-3 w-full"
        onClick={handleConnect}
        disabled={busy || supported === false}
      >
        {busy ? "Procurando…" : firstTime ? "Parear Bluetooth" : "Reconectar"}
      </Button>
    </section>
  );
}
