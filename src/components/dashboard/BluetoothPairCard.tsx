import { useState } from "react";
import { Bluetooth, BluetoothConnected, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/hooks/useTelemetry";

/**
 * Card de pareamento do modo Econômico. O modal nativo do navegador só abre a
 * partir de um clique do usuário, por isso o botão vive no Painel.
 */
export function BluetoothPairCard() {
  const { source, status, connect, supported, deviceName, savedDevice, error, progress } =
    useTelemetry();
  const [busy, setBusy] = useState(false);

  if (source !== "elm327" || status === "connected") return null;

  const firstTime = !savedDevice;
  const knownName = savedDevice?.name ?? deviceName;
  const insecure =
    typeof window !== "undefined" &&
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost";

  async function handleConnect() {
    if (!connect) return;
    setBusy(true);
    const toastId = toast.loading("Procurando adaptador OBD-II…");
    try {
      await connect();
      toast.success("Adaptador conectado", {
        id: toastId,
        description: "Lendo RPM, velocidade e combustível do motor.",
      });
    } catch (e) {
      toast.error("Não foi possível conectar", {
        id: toastId,
        description: (e as Error).message,
        duration: 8000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface mt-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : knownName ? (
            <BluetoothConnected className="size-5" />
          ) : (
            <Bluetooth className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">
            {firstTime ? "Parear adaptador OBD-II" : `Reconectar a ${knownName ?? "adaptador"}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {supported === false
              ? "Web Bluetooth indisponível neste navegador. Abra o app no Chrome do Android."
              : insecure
                ? "O Bluetooth do navegador exige HTTPS. Abra o app pelo endereço publicado (https)."
                : busy && progress
                  ? progress
                  : firstTime
                    ? "Primeiro pareamento: vamos memorizar o adaptador para as próximas viagens."
                    : "Adaptador já memorizado. Toque para retomar a leitura de RPM, velocidade e combustível."}
          </p>
          {error && !busy && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {firstTime && supported !== false && (
        <ol className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-background/35 px-3 py-2.5 text-xs text-muted-foreground">
          <li>1. Plugue o ELM327 na porta OBD-II do carro e ligue a ignição.</li>
          <li>2. Ative o Bluetooth do celular e use o Chrome no Android.</li>
          <li>3. Toque em “Parear Bluetooth” e escolha o adaptador na lista do navegador.</li>
          <li>
            4. Importante: o adaptador precisa ser <strong>BLE (Bluetooth 4.0/5.0)</strong>. Modelos
            clássicos (SPP) não são acessíveis pelo navegador.
          </li>
        </ol>
      )}

      <Button
        className="mt-3 w-full"
        onClick={handleConnect}
        disabled={busy || supported === false}
      >
        {busy
          ? "Conectando…"
          : firstTime
            ? "Parear Bluetooth"
            : "Reconectar"}
      </Button>

      {status === "error" && !busy && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Dica: se o adaptador aparece na lista mas falha ao conectar, remova o pareamento nas
          configurações de Bluetooth do Android e tente novamente aqui.
        </p>
      )}
    </section>
  );
}
