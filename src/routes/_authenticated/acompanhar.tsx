import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Car,
  Clock,
  Eye,
  Gauge,
  LogIn,
  LogOut,
  MapPinOff,
  Radar,
  Route as RouteIcon,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const VehicleMap = lazy(() => import("@/components/map/VehicleMap"));


export const Route = createFileRoute("/_authenticated/acompanhar")({
  head: () => ({
    meta: [
      { title: "Acompanhar veículo · Telemetrix" },
      {
        name: "description",
        content:
          "Modo observador: veja em tempo real onde o veículo está, se o motor está ligado e os últimos eventos de segurança.",
      },
      { property: "og:title", content: "Acompanhar veículo · Telemetrix" },
      {
        property: "og:description",
        content: "Modo observador somente leitura: localização e eventos do veículo.",
      },
    ],
  }),
  component: FollowPage,
});

type TrackerEvent = Tables<"tracker_events">;

const EVENT_META: Record<
  TrackerEvent["type"],
  { label: string; Icon: typeof LogIn; color: string; bg: string }
> = {
  ignition_on: { label: "Motor ligado", Icon: LogIn, color: "text-success", bg: "bg-success/10" },
  ignition_off: {
    label: "Motor desligado",
    Icon: LogOut,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  motion_off_ignition: {
    label: "Movimento suspeito",
    Icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  geofence_enter: { label: "Chegou na cerca", Icon: LogIn, color: "text-chart-3", bg: "bg-chart-3/10" },
  geofence_exit: {
    label: "Saiu da cerca",
    Icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  signal_lost: {
    label: "Sinal perdido",
    Icon: MapPinOff,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};

const dtf = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function relative(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return dtf.format(new Date(iso));
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Relógio de 1s usado apenas quando há viagem em andamento. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}



function FollowPage() {
  const { data: share, isLoading } = useQuery({
    queryKey: ["my-share"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_shares")
        .select("id,vehicle_id,label,accepted_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const vehicleId = share?.vehicle_id ?? null;

  // Registra o primeiro acesso do observador (aceite do convite).
  useEffect(() => {
    if (!share || share.accepted_at) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      await supabase
        .from("vehicle_shares")
        .update({ accepted_at: new Date().toISOString(), viewer_user_id: uid })
        .eq("id", share.id);
    })();
  }, [share]);

  const { data: vehicle } = useQuery({
    queryKey: ["shared-vehicle", vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,plate")
        .eq("id", vehicleId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: state } = useQuery({
    queryKey: ["shared-state", vehicleId],
    enabled: !!vehicleId,
    refetchInterval: (query) => (query.state.data?.ignition_on ? 5000 : 20000),

    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_trip_state")
        .select(
          "ignition_on,start_time,last_lat,last_lng,last_mileage,max_speed_kmh,updated_at,last_message_at",
        )
        .eq("vehicle_id", vehicleId!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pings } = useQuery({
    queryKey: ["shared-pings", vehicleId],
    enabled: !!vehicleId,
    refetchInterval: state?.ignition_on ? 5000 : 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracker_pings")
        .select("lat,lng,speed_kmh,recorded_at")
        .eq("vehicle_id", vehicleId!)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["shared-events", vehicleId],
    enabled: !!vehicleId,
    refetchInterval: 30000,
    queryFn: async (): Promise<TrackerEvent[]> => {
      const { data, error } = await supabase
        .from("tracker_events")
        .select("*")
        .eq("vehicle_id", vehicleId!)
        .order("occurred_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TrackerEvent[];
    },
  });

  const trail = useMemo(
    () =>
      (pings ?? [])
        .slice()
        .reverse()
        .map((p) => ({
          lat: p.lat,
          lng: p.lng,
          speed: p.speed_kmh != null ? Number(p.speed_kmh) : null,
          t: new Date(p.recorded_at).getTime(),
        })),
    [pings],
  );

  const latest = pings?.[0];
  const lat = state?.last_lat ?? latest?.lat ?? null;
  const lng = state?.last_lng ?? latest?.lng ?? null;
  const ignitionOn = state?.ignition_on ?? null;
  const speed = latest?.speed_kmh != null ? Number(latest.speed_kmh) : null;
  const lastSeen = state?.last_message_at ?? latest?.recorded_at ?? null;

  const tripActive = !!(ignitionOn && state?.start_time);
  const now = useNow(tripActive);
  const startMs = state?.start_time ? new Date(state.start_time).getTime() : null;

  // Métricas da viagem em andamento, calculadas a partir dos pings desde a partida.
  const live = useMemo(() => {
    if (!tripActive || !startMs) return null;
    const pts = (pings ?? [])
      .filter((p) => new Date(p.recorded_at).getTime() >= startMs - 60_000)
      .slice()
      .reverse();
    let distance = 0;
    let max = 0;
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i].speed_kmh != null ? Number(pts[i].speed_kmh) : 0;
      if (s > max) max = s;
      if (i > 0) distance += haversineKm(pts[i - 1], pts[i]);
    }
    const elapsedMs = now - startMs;
    const hours = elapsedMs / 3_600_000;
    return {
      distance,
      maxSpeed: Math.max(max, Number(state?.max_speed_kmh ?? 0)),
      avgSpeed: hours > 0.002 ? distance / hours : 0,
      elapsedMs,
      points: pts.length,
    };
  }, [tripActive, startMs, pings, now, state?.max_speed_kmh]);


  if (isLoading) {
    return (
      <AppShell title="Acompanhar" subtitle="Modo observador">
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  }

  if (!share) {
    return (
      <AppShell title="Acompanhar" subtitle="Modo observador">
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Eye className="size-5" />
          </span>
          <h2 className="mt-3 font-display text-sm font-semibold">
            Nenhum veículo compartilhado com você
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Peça ao dono do veículo para convidar este e-mail em Gestão → Observadores.
            O convite precisa usar exatamente o e-mail desta conta.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={vehicle?.name ?? "Acompanhar"}
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-3" /> somente leitura · atualizado {relative(lastSeen)}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Tile
          label="Motor"
          value={ignitionOn == null ? "—" : ignitionOn ? "Ligado" : "Desligado"}
          tone={ignitionOn ? "success" : "muted"}
          Icon={Car}
        />
        <Tile
          label="Velocidade"
          value={speed != null ? `${Math.round(speed)} km/h` : "—"}
          Icon={Gauge}
        />
        <Tile
          label="Viagem"
          value={live ? formatDuration(live.elapsedMs) : "parado"}
          tone={live ? "success" : "muted"}
          Icon={Radar}
        />
      </div>

      {live && (
        <div className="card-surface relative overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
              <span className="relative grid size-2.5 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
                <span className="size-2 rounded-full bg-success" />
              </span>
              Viagem em andamento
            </h2>
            <span className="text-[11px] text-muted-foreground">
              início {dtf.format(new Date(state!.start_time!))}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LiveStat
              label="Duração"
              value={formatDuration(live.elapsedMs)}
              Icon={Clock}
            />
            <LiveStat
              label="Distância"
              value={`${live.distance.toFixed(1)} km`}
              Icon={RouteIcon}
            />
            <LiveStat
              label="Média"
              value={`${Math.round(live.avgSpeed)} km/h`}
              Icon={Gauge}
            />
            <LiveStat
              label="Máxima"
              value={`${Math.round(live.maxSpeed)} km/h`}
              Icon={Zap}
            />
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            {live.points} pontos recebidos · última posição {relative(lastSeen)}
          </p>
        </div>
      )}



      <div className="overflow-hidden rounded-2xl border border-border/70">
        <div className="h-[52vh] w-full">
          <ClientOnly fallback={<div className="size-full animate-pulse bg-muted" />}>
            <Suspense fallback={<div className="size-full animate-pulse bg-muted" />}>
              <VehicleMap
                lat={lat}
                lng={lng}
                speed={speed}
                ignition={ignitionOn}
                trail={trail}
                lastUpdate={lastSeen ? new Date(lastSeen).getTime() : null}
                status={ignitionOn ? "Em movimento" : "Estacionado"}
              />
            </Suspense>
          </ClientOnly>
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Últimos eventos
        </h2>
        {!events || events.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((e) => {
              const meta = EVENT_META[e.type];
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-xl ${meta.bg} ${meta.color}`}
                  >
                    <meta.Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {dtf.format(new Date(e.occurred_at))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Tile({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  Icon: typeof Car;
  tone?: "success" | "muted";
}) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div
        className={`mt-1 truncate text-sm font-semibold ${
          tone === "success" ? "text-success" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
