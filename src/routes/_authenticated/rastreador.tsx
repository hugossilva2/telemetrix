import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, LogIn, LogOut, MapPinOff, Plus, Radar, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useParkedSpot } from "@/lib/tracker/parked";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));

export const Route = createFileRoute("/_authenticated/rastreador")({
  head: () => ({
    meta: [
      { title: "Rastreador · Telemetrix" },
      { name: "description", content: "Localização, alertas de segurança e histórico de eventos do veículo." },
      { property: "og:title", content: "Rastreador · Telemetrix" },
      { property: "og:description", content: "Modo rastreador com alertas e pontos salvos." },
    ],
  }),
  component: RastreadorPage,
});

type TrackerEvent = Tables<"tracker_events">;

const EVENT_META: Record<
  TrackerEvent["type"],
  { label: string; Icon: typeof LogIn; color: string; bg: string }
> = {
  ignition_on: { label: "Motor ligado", Icon: LogIn, color: "text-success", bg: "bg-success/10" },
  ignition_off: { label: "Motor desligado", Icon: LogOut, color: "text-muted-foreground", bg: "bg-muted" },
  motion_off_ignition: {
    label: "Movimento suspeito",
    Icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  geofence_enter: {
    label: "Chegou na cerca",
    Icon: LogIn,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  geofence_exit: {
    label: "Saiu da cerca",
    Icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
  },

  signal_lost: { label: "Sinal perdido", Icon: MapPinOff, color: "text-orange-500", bg: "bg-orange-500/10" },
};

const dtf = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
});

function RastreadorPage() {
  const { telemetry, status, lastMessageAt } = useTelemetry();
  const parked = useParkedSpot(telemetry.latitude, telemetry.longitude, telemetry.ignitionOn);
  const qc = useQueryClient();


  const { data: events = [] } = useQuery({
    queryKey: ["tracker_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracker_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as TrackerEvent[];
    },
    refetchInterval: 15_000,
  });

  const eventsToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return events.filter((e) => new Date(e.occurred_at) >= start).length;
  }, [events]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const saving = useMutation({
    mutationFn: async () => {
      const lat = telemetry.latitude;
      const lng = telemetry.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error("Sem posição atual — aguarde o próximo sinal");
      }
      if (!name.trim()) throw new Error("Dê um apelido ao ponto");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Faça login novamente");
      const { error } = await supabase.from("favorite_places").insert({
        user_id: uid,
        name: name.trim(),
        icon: "pin",
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ponto salvo");
      setOpen(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["favorite_places"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fallback = (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  );

  return (
    <AppShell
      title="Rastreador"
      subtitle={
        <span className="flex items-center gap-1.5">
          <Radar className="size-3" />
          {status === "connected" ? "Ao vivo" : "Sem sinal"}
          {" · "}
          {eventsToday} {eventsToday === 1 ? "evento" : "eventos"} hoje
        </span>
      }
    >
      <section className="h-[52dvh] min-h-[320px] overflow-hidden rounded-2xl border border-border">
        <ClientOnly fallback={fallback}>
          <Suspense fallback={fallback}>
            <VehicleMap
              lat={telemetry.latitude}
              lng={telemetry.longitude}
              speed={telemetry.speedKmh}
              ignition={telemetry.ignitionOn}
              lastUpdate={lastMessageAt}
              status={status}
              parked={parked}
            />

          </Suspense>
        </ClientOnly>
      </section>

      <div className="mt-3">
        <DistanceToCarCard
          carLat={typeof telemetry.latitude === "number" ? telemetry.latitude : parked?.lat}
          carLng={typeof telemetry.longitude === "number" ? telemetry.longitude : parked?.lng}
          usingParked={typeof telemetry.latitude !== "number" && !!parked}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-11">
              <Plus className="mr-1.5 size-4" />
              Salvar posição atual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                {typeof telemetry.latitude === "number" && typeof telemetry.longitude === "number"
                  ? `Coordenadas: ${telemetry.latitude.toFixed(5)}, ${telemetry.longitude.toFixed(5)}`
                  : "Aguardando posição do veículo…"}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-name">Apelido</Label>
                <Input
                  id="pt-name"
                  placeholder="Ex.: Oficina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => saving.mutate()}
                disabled={saving.isPending}
                className="w-full"
              >
                {saving.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" className="h-11" asChild>
          <Link to="/lugares">
            <Radar className="mr-1.5 size-4" />
            Meus pontos
          </Link>
        </Button>
      </div>

      <section className="contents">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eventos recentes
        </h2>
        {events.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhum evento ainda. Assim que o veículo ligar ou desligar, aparece aqui.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {events.map((e) => {
              const meta = EVENT_META[e.type];
              const { Icon } = meta;
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className={`grid size-10 place-items-center rounded-full ${meta.bg} ${meta.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{meta.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dtf.format(new Date(e.occurred_at))}
                      {typeof e.lat === "number" && typeof e.lng === "number"
                        ? ` · ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
