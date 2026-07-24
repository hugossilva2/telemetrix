import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - iOS Safari
      window.navigator.standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Smartphone className="size-4 text-primary" />
        Instalar aplicativo
      </header>

      {installed ? (
        <p className="text-xs text-muted-foreground">
          App já instalado neste dispositivo. Abra pelo ícone na tela inicial.
        </p>
      ) : deferred ? (
        <>
          <p className="text-xs text-muted-foreground">
            Instale o Telemetrix como app nativo para receber notificações e abrir em tela cheia.
          </p>
          <Button type="button" onClick={install} className="mt-3 w-full">
            <Download className="mr-2 size-4" />
            Instalar agora
          </Button>
        </>
      ) : isIOS ? (
        <p className="text-xs text-muted-foreground">
          No iPhone: toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Abra este site no Chrome/Edge do Android e toque em <strong>“Instalar app”</strong> no menu.
          Para gerar um <strong>.apk</strong> assinado, acesse{" "}
          <a
            href="https://www.pwabuilder.com/reportcard?site=https://drive-wise-69.lovable.app"
            target="_blank"
            rel="noreferrer"
            className="underline text-primary"
          >
            PWABuilder
          </a>
          , clique em <em>Package for Stores → Android</em> e baixe o pacote.
        </p>
      )}
    </section>
  );
}
