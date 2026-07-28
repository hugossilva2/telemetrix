import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  Fuel,
  Gauge,
  IdCard,
  Phone,
  Route as RouteIcon,
  ShieldCheck,
  Timer,
  TrendingDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DriverAvatar } from "@/components/drivers/DriverAvatar";
import { DriverBadges } from "@/components/drivers/DriverBadges";
import { DriverScoreCard } from "@/components/drivers/DriverScoreCard";
import { DriverEditDialog } from "@/components/drivers/DriverEditDialog";
import { EcoScoreBadge } from "@/components/eco/EcoScoreRing";
import { useDriver, useDriverSafeStarts, useDriverTrips } from "@/lib/drivers/api";
import { computeDriverScore, monthlyScoreSeries } from "@/lib/drivers/score";
import { ECO_EVENT_COLOR, ECO_EVENT_LABEL, formatIdle } from "@/lib/eco/score";
import type { EcoEventType } from "@/lib/eco/detect";
import { formatBRL, formatDecimal, formatKm, formatSpeed } from "@/lib/format";
import { formatDateTime, formatDurationSeconds } from "@/lib/trips/format";

export const Route = createFileRoute("/_authenticated/motoristas/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do motorista · Telemetrix" },
      {
        name: "description",
        content:
          "Perfil do motorista com nota de direção segura, eficiência de consumo, partidas seguras e destaques conquistados.",
      },
      { property: "og:title", content: "Perfil do motorista · Telemetrix" },
      {
        property: "og:description",
        content: "Nota de condução, consumo, partidas seguras e destaques do motorista.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverProfilePage,
  errorComponent: ({ error }) => (
    <AppShell title="Perfil do motorista">
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Perfil do motorista">
      <p className="text-sm text-muted-foreground">Motorista não encontrado.</p>
    </AppShell>
  ),
});

const EVENT_ORDER: EcoEventType[] = [
  "harsh_brake",
  "harsh_accel",
  "harsh_corner",
  "overspeed",
  "high_rpm",
];

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DriverProfilePage() {
  const { id } = Route.useParams();
  const { data: driver, isLoading } = useDriver(id);
  const { data: trips = [] } = useDriverTrips(id);
  const { data: safeStarts = [] } = useDriverSafeStarts(id);

  const result = useMemo(() => computeDriverScore(trips, safeStarts), [trips, safeStarts]);
  const series = useMemo(() => monthlyScoreSeries(trips), [trips]);
  const { stats } = result;

  return (
    <AppShell title={driver?.name ?? "Motorista"}>
      <Link
        to="/motoristas"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Motoristas
      </Link>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando perfil…</p>}
      {!isLoading && !driver && (
        <p className="text-sm text-muted-foreground">Motorista não encontrado.</p>
      )}

      {driver && (
        <div className="space-y-4 pb-6">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <DriverAvatar name={driver.name} photoPath={driver.photo_path} size={64} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{driver.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {driver.is_default && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    Padrão
                  </span>
                )}
                {driver.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {driver.phone}
                  </span>
                )}
                {driver.license_number && (
                  <span className="inline-flex items-center gap-1">
                    <IdCard className="size-3" />
                    CNH {driver.license_number}
                    {driver.license_category ? ` · ${driver.license_category}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto">
              <DriverEditDialog driver={driver} />
            </div>
          </div>


          <DriverScoreCard score={result.score} pillars={result.pillars} />

          <section>
            <h2 className="mb-2 text-sm font-semibold">Destaques</h2>
            <DriverBadges score={result} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Números do condutor</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Kpi icon={RouteIcon} label="Viagens" value={String(stats.trips)} />
              <Kpi icon={Gauge} label="Distância" value={formatKm(stats.distanceKm)} />
              <Kpi
                icon={Clock}
                label="Tempo ao volante"
                value={formatDurationSeconds(stats.drivingSeconds)}
              />
              <Kpi
                icon={Fuel}
                label="Consumo médio"
                value={stats.kmPerLiter == null ? "—" : `${formatDecimal(stats.kmPerLiter)} km/L`}
              />
              <Kpi icon={Fuel} label="Custo estimado" value={formatBRL(stats.cost)} />
              <Kpi
                icon={TrendingDown}
                label="Custo por km"
                value={stats.costPerKm == null ? "—" : formatBRL(stats.costPerKm)}
              />
              <Kpi
                icon={Fuel}
                label="Desperdício"
                value={`${formatDecimal(stats.wastedLiters)} L · ${formatBRL(stats.wastedCost)}`}
              />
              <Kpi icon={Timer} label="Marcha lenta" value={formatIdle(stats.idleSeconds)} />
              <Kpi
                icon={Gauge}
                label="Velocidade máxima"
                value={stats.maxSpeedKmh == null ? "—" : formatSpeed(stats.maxSpeedKmh)}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Eventos de direção</h2>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_ORDER.map((type) => (
                <div
                  key={type}
                  className="rounded-xl border border-border/60 bg-card p-2 text-center"
                >
                  <div
                    className={`text-[10px] uppercase tracking-wide ${ECO_EVENT_COLOR[type]}`}
                  >
                    {ECO_EVENT_LABEL[type]}
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums">
                    {stats.counts[type]}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-border/60 bg-card p-2 text-center">
                <div className="text-[10px] uppercase tracking-wide text-emerald-500">
                  Partidas seguras
                </div>
                <div className="mt-1 text-base font-semibold tabular-nums">
                  {stats.safeStartsReady}/{stats.safeStartsRequired}
                </div>
              </div>
            </div>
          </section>

          {series.length > 1 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">Evolução da nota</h2>
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-4">
                {series.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {m.score}
                    </span>
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${Math.max(4, m.score)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ShieldCheck className="size-4" /> Últimas partidas seguras
            </h2>
            {safeStarts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma partida sincronizada ainda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {safeStarts.slice(0, 8).map((s) => (
                  <li
                    key={s.started_at}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-xs"
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {formatDateTime(s.started_at)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      min {s.min_rpm == null ? "—" : `${Math.round(Number(s.min_rpm))} rpm`}
                    </span>
                    <span
                      className={`ml-auto font-medium ${
                        s.ready
                          ? "text-emerald-500"
                          : s.required
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {s.ready ? "pronto" : s.required ? "não aguardou" : "n/a"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Viagens recentes</h2>
            {trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma viagem vinculada a este motorista ainda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {trips.slice(0, 10).map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/viagens/$id"
                      params={{ id: t.id }}
                      className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-xs"
                    >
                      <span className="tabular-nums text-muted-foreground">
                        {formatDateTime(t.start_time)}
                      </span>
                      <span className="tabular-nums">{formatKm(Number(t.distance_km ?? 0))}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <EcoScoreBadge score={t.eco_score} />
                        <span className="tabular-nums text-muted-foreground">
                          {formatBRL(Number(t.estimated_cost ?? 0))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
