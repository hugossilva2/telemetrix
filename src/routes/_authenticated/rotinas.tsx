import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CheckupButtons, useCheckups } from "@/components/checkups/CheckupButtons";
import { summarizeCheckups } from "@/lib/checkups/rules";

export const Route = createFileRoute("/_authenticated/rotinas")({
  head: () => ({
    meta: [
      { title: "Rotinas de conferência · Telemetrix" },
      {
        name: "description",
        content:
          "Checagens semanais e mensais do veículo: óleo, arrefecimento, pneus, faróis, água do limpador e lavagem.",
      },
      { property: "og:title", content: "Rotinas de conferência · Telemetrix" },
      {
        property: "og:description",
        content: "Registre cada conferência e veja o que está pendente no seu veículo.",
      },
    ],
  }),
  component: RotinasPage,
});

const NOTIFIED_KEY = "checkupNotified:v1";

function alreadyNotifiedToday(key: string) {
  if (typeof window === "undefined") return true;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (map[key] === today) return true;
    map[key] = today;
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
    return false;
  } catch {
    return true;
  }
}

function RotinasPage() {
  const { data: records = [] } = useCheckups();
  const summary = summarizeCheckups(records);
  const pending = summary.filter((s) => s.info.status === "pending");

  useEffect(() => {
    for (const p of pending) {
      if (alreadyNotifiedToday(`${p.def.value}:pending`)) continue;
      toast.warning(`${p.def.label} pendente`, { description: p.info.message });
    }
  }, [pending]);

  return (
    <AppShell
      title="Rotinas"
      subtitle={
        pending.length === 0
          ? "Todas as conferências em dia"
          : `${pending.length} rotina(s) pendente(s)`
      }
    >
      <div className="card-surface flex items-start gap-3 p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <ClipboardCheck className="size-5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Toque em <strong className="text-foreground">Conferir</strong> depois de checar cada item.
          Rotinas semanais vencem em 7 dias e as mensais em 30 — passando disso, ficam marcadas como
          pendentes e derrubam a saúde do veículo.
        </p>
      </div>

      <div className="mt-4">
        <CheckupButtons />
      </div>
    </AppShell>
  );
}
