import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Award, Flame, Leaf, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { EcoScoreRing } from "@/components/eco/EcoScoreRing";
import { TelemetryDiagnosticsCard } from "@/components/eco/TelemetryDiagnosticsCard";
import { DrivingHabitsCard } from "@/components/coach/DrivingHabitsCard";

import { ECO_EVENT_COLOR, ECO_EVENT_LABEL, ecoBand, formatIdle } from "@/lib/eco/score";
import type { EcoEventType } from "@/lib/eco/detect";
import {
  DEFAULT_ECO_SETTINGS,

  getEcoSettings,
  saveEcoSettings,
} from "@/lib/eco/settings";
import { VehicleSpecCard } from "@/components/vehicles/VehicleSpecCard";
import { fuelLabel, type FuelKind } from "@/lib/vehicles/specs";

import { formatBRL, formatDecimal } from "@/lib/format";
import { formatDateTime } from "@/lib/trips/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eco")({
  head: () => ({
    meta: [
      { title: "Eco Score · Telemetrix" },
      {
        name: "description",
        content:
          "Pontuação de direção de 0 a 100: freadas bruscas, acelerações agressivas, curvas e combustível desperdiçado.",
      },
      { property: "og:title", content: "Eco Score · Telemetrix" },
      {
        property: "og:description",
        content: "Sua nota de direção, eventos do mês e quanto dá para economizar.",
      },
    ],
  }),
  component: EcoPage,
});

type EcoTrip = {
  id: string;
  start_time: string;
  distance_km: number | null;
  eco_score: number | null;
  harsh_brake_count: number | null;
  harsh_accel_count: number | null;
  harsh_corner_count: number | null;
  overspeed_count: number | null;
  high_rpm_count: number | null;
  idle_seconds: number | null;
  wasted_fuel_liters: number | null;
  wasted_cost: number | null;
};

const TYPES: EcoEventType[] = [
  "harsh_brake",
  "harsh_accel",
  "harsh_corner",
  "overspeed",
  "high_rpm",
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function EcoPage() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["eco-trips"],
    queryFn: async (): Promise<EcoTrip[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id,start_time,distance_km,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count,idle_seconds,wasted_fuel_liters,wasted_cost",
        )
        .not("eco_score", "is", null)
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as EcoTrip[];
    },
  });

  const stats = useMemo(() => {
    const rows = trips ?? [];
    if (rows.length === 0) return null;
    const now = new Date();
    const curKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${prev.getMonth()}`;

    const cur = rows.filter((t) => monthKey(t.start_time) === curKey);
    const last = rows.filter((t) => monthKey(t.start_time) === prevKey);

    const avg = (list: EcoTrip[]) =>
      list.length > 0
        ? list.reduce((s, t) => s + (t.eco_score ?? 0), 0) / list.length
        : null;

    const counts: Record<EcoEventType, number> = {
      harsh_brake: 0,
      harsh_accel: 0,
      harsh_corner: 0,
      overspeed: 0,
      high_rpm: 0,
    };
    for (const t of cur) {
      counts.harsh_brake += t.harsh_brake_count ?? 0;
      counts.harsh_accel += t.harsh_accel_count ?? 0;
      counts.harsh_corner += t.harsh_corner_count ?? 0;
      counts.overspeed += t.overspeed_count ?? 0;
      counts.high_rpm += t.high_rpm_count ?? 0;
    }
    const maxCount = Math.max(1, ...TYPES.map((k) => counts[k]));

    const wastedL = cur.reduce((s, t) => s + (t.wasted_fuel_liters ?? 0), 0);
    const wastedR = cur.reduce((s, t) => s + (t.wasted_cost ?? 0), 0);
    const idle = cur.reduce((s, t) => s + (t.idle_seconds ?? 0), 0);

    const best = [...rows].sort((a, b) => (b.eco_score ?? 0) - (a.eco_score ?? 0))[0];

    // sequência de viagens recentes com nota >= 90
    let streak = 0;
    for (const t of rows) {
      if ((t.eco_score ?? 0) >= 90) streak += 1;
      else break;
    }
    const weekAgo = Date.now() - 7 * 86400_000;
    const weekTrips = rows.filter((t) => new Date(t.start_time).getTime() >= weekAgo);
    const cleanWeek =
      weekTrips.length >= 3 &&
      weekTrips.every((t) => (t.harsh_brake_count ?? 0) === 0);

    return {
      curAvg: avg(cur),
      lastAvg: avg(last),
      curCount: cur.length,
      counts,
      maxCount,
      wastedL,
      wastedR,
      idle,
      best,
      streak,
      cleanWeek,
      recent: rows.slice(0, 12),
    };
  }, [trips]);

  const [settings, setSettings] = useState(() => getEcoSettings());

  const diff =
    stats?.curAvg != null && stats?.lastAvg != null
      ? stats.curAvg - stats.lastAvg
      : null;

  return (
    <AppShell title="Eco Score" subtitle="Sua nota de direção de 0 a 100">
      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !stats ? (
        <div className="card-surface p-4 text-sm text-muted-foreground">
          Ainda não há viagens pontuadas. Assim que você fizer uma viagem com o
          motor ligado, a nota aparece aqui automaticamente.
        </div>
      ) : (
        <>
          <section className="flex items-center gap-4 card-surface p-4">
            <EcoScoreRing
              score={stats.curAvg}
              size={110}
              label={ecoBand(stats.curAvg ?? undefined).label}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Média do mês</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.curCount} viagem(ns) pontuada(s)
              </p>
              {diff != null && (
                <p
                  className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                    diff >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {diff >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(1)} pontos vs. mês anterior
                </p>
              )}
            </div>
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-warning">
                Desperdício do mês
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-warning">
                {formatBRL(stats.wastedR)}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {formatDecimal(stats.wastedL)} L a mais
              </p>
            </div>
            <div className="card-surface p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Marcha lenta
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatIdle(stats.idle)}
              </p>
              <p className="text-[11px] text-muted-foreground">motor ligado parado</p>
            </div>
          </section>

          <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eventos do mês
          </h2>
          <div className="space-y-2 card-surface p-4">
            {TYPES.map((type) => (
              <div key={type}>
                <div className="flex items-center justify-between text-xs">
                  <span className={ECO_EVENT_COLOR[type]}>{ECO_EVENT_LABEL[type]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {stats.counts[type]}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(stats.counts[type] / stats.maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conquistas
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Achievement
              Icon={Flame}
              label="Sequência 90+"
              value={`${stats.streak}`}
              active={stats.streak >= 3}
            />
            <Achievement
              Icon={Leaf}
              label="Semana sem freada"
              value={stats.cleanWeek ? "Sim" : "Não"}
              active={stats.cleanWeek}
            />
            <Achievement
              Icon={Award}
              label="Melhor viagem"
              value={
                stats.best?.eco_score != null ? `${Math.round(stats.best.eco_score)}` : "—"
              }
              active={(stats.best?.eco_score ?? 0) >= 90}
            />
          </div>

          <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evolução por viagem
          </h2>
          <ul className="space-y-1.5">
            {stats.recent.map((t) => {
              const band = ecoBand(t.eco_score);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${band.bg} ${band.color}`}
                  >
                    {Math.round(t.eco_score ?? 0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {formatDateTime(t.start_time)}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {formatDecimal(t.distance_km ?? 0)} km ·{" "}
                      {(t.harsh_brake_count ?? 0) + (t.harsh_accel_count ?? 0) +
                        (t.harsh_corner_count ?? 0)}{" "}
                      evento(s)
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-warning">
                    {formatBRL(t.wasted_cost ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ficha técnica do veículo
      </h2>
      <VehicleSpecCard fuel={settings.fuel} />

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ajustes da pontuação
      </h2>
      <div className="space-y-3 card-surface p-4">
        <div>
          <Label className="text-sm">Combustível em uso</Label>
          <p className="text-[11px] text-muted-foreground">
            Define a meta de consumo (Inmetro) usada nos scores.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["etanol", "gasolina", "misto"] as FuelKind[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSettings({ ...settings, fuel: f })}
                className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  settings.fuel === f
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-border bg-background/35 text-muted-foreground"
                }`}
              >
                {fuelLabel(f)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="live-alerts" className="text-sm">
              Avisos em tempo real
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Notifica quando registra um evento severo durante a viagem.
            </p>
          </div>
          <Switch
            id="live-alerts"
            checked={settings.liveAlerts}
            onCheckedChange={(v) => setSettings({ ...settings, liveAlerts: v })}
          />
        </div>


        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="max-speed" className="text-xs">
              Velocidade máxima (km/h)
            </Label>
            <Input
              id="max-speed"
              type="number"
              inputMode="numeric"
              value={settings.thresholds.maxSpeedKmh}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: {
                    ...settings.thresholds,
                    maxSpeedKmh: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="max-rpm" className="text-xs">
              Giro de alerta (rpm)
            </Label>
            <Input
              id="max-rpm"
              type="number"
              inputMode="numeric"
              value={settings.thresholds.maxRpm}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: {
                    ...settings.thresholds,
                    maxRpm: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              saveEcoSettings(settings);
              toast.success("Ajustes salvos");
            }}
          >
            <Sparkles className="size-4" /> Salvar ajustes
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSettings(DEFAULT_ECO_SETTINGS);
              saveEcoSettings(DEFAULT_ECO_SETTINGS);
              toast.success("Padrões restaurados");
            }}
          >
            Padrão
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          A nota é calculada a partir da velocidade, do rumo, do RPM e da carga do
          motor, com os limites calibrados pela ficha técnica do veículo: aceleração
          de fábrica (0-100 em 11,5 s), faixa econômica de 1.500-2.500 rpm e as metas
          de consumo Inmetro do combustível selecionado.
        </p>
      </div>

      <DrivingHabitsCard limit={20} />
      <TelemetryDiagnosticsCard />
    </AppShell>

  );
}

function Achievement({
  Icon,
  label,
  value,
  active,
}: {
  Icon: typeof Award;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        active
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <Icon className="mx-auto size-4" />
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] leading-tight">{label}</p>
    </div>
  );
}
