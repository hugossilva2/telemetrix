import type React from "react";
import {
  BatteryCharging,
  Bell,
  CalendarClock,
  Camera,
  Check,
  Fuel,
  Gauge,
  Leaf,
  MapPin,
  Navigation,
  Radar,
  Route as RouteIcon,
  Thermometer,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { GaugeRing } from "@/components/dashboard/GaugeRing";
import { DemoMap } from "@/components/demo/DemoMap";
import {
  brl,
  DEMO_ACTIVE_VEHICLE,
  DEMO_DOCS,
  DEMO_FUEL_LOGS,
  DEMO_LIVE,
  DEMO_MAINTENANCE,
  DEMO_REPORT,
  DEMO_TRACKER,
  DEMO_TRIPS,
} from "@/lib/demo/data";
import { cn } from "@/lib/utils";

export type DemoScreenId = "painel" | "viagens" | "relatorio" | "abastecer" | "rastreio";

export const DEMO_SCREENS: { id: DemoScreenId; label: string; Icon: typeof Gauge }[] = [
  { id: "painel", label: "Painel", Icon: Gauge },
  { id: "viagens", label: "Viagens", Icon: RouteIcon },
  { id: "relatorio", label: "Relatório", Icon: TrendingUp },
  { id: "abastecer", label: "Abastecer", Icon: Fuel },
  { id: "rastreio", label: "Rastreio", Icon: Radar },
];

const toneClass = {
  ok: "text-success",
  warn: "text-warning",
  info: "text-primary",
} as const;

function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{subtitle}</p>
      <h3 className="font-display text-lg font-bold leading-tight">{title}</h3>
    </header>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", strong && "font-display font-bold text-primary")}>
        {value}
      </span>
    </div>
  );
}

function PainelScreen() {
  const v = DEMO_ACTIVE_VEHICLE;
  const liters = (DEMO_LIVE.fuelPct / 100) * v.tankL;
  return (
    <div className="space-y-3">
      <ScreenHeader title={v.name} subtitle={`${v.plate} · motor ligado · ${DEMO_LIVE.updatedAgo}`} />

      <section className="card-surface p-4">
        <div className="grid grid-cols-3 gap-2">
          <GaugeRing
            label="Velocidade"
            value={DEMO_LIVE.speedKmh}
            max={180}
            arcClassName="text-primary"
          >
            <span className="font-display text-xl font-bold tabular-nums">
              {DEMO_LIVE.speedKmh}
            </span>
            <span className="block text-[10px] text-muted-foreground">km/h</span>
          </GaugeRing>
          <GaugeRing
            label="Giro"
            value={DEMO_LIVE.rpm}
            max={6000}
            arcClassName="text-warning"
            zones={[
              { from: DEMO_LIVE.ecoRpmMin, to: DEMO_LIVE.ecoRpmMax, className: "text-success" },
              { from: 4500, to: 6000, className: "text-destructive" },
            ]}
          >
            <span className="font-display text-xl font-bold tabular-nums">{DEMO_LIVE.rpm}</span>
            <span className="block text-[10px] text-muted-foreground">rpm</span>
          </GaugeRing>
          <GaugeRing
            label="Combustível"
            value={DEMO_LIVE.fuelPct}
            max={100}
            arcClassName="text-success"
          >
            <span className="font-display text-xl font-bold tabular-nums">
              {DEMO_LIVE.fuelPct}%
            </span>
            <span className="block text-[10px] text-muted-foreground">
              {liters.toFixed(0)} L
            </span>
          </GaugeRing>
        </div>
      </section>

      <section className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Fuel className="size-4 text-primary" /> Autonomia
          </h4>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
            folgado
          </span>
        </div>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums text-primary">
          {DEMO_LIVE.autonomyKm} km
        </p>
        <p className="text-xs text-muted-foreground">
          consumo medido agora: {DEMO_LIVE.kmpl.toFixed(1)} km/L
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/30 p-2">
            <Thermometer className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1 text-sm font-semibold tabular-nums">{DEMO_LIVE.coolantC}°C</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-2">
            <BatteryCharging className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1 text-sm font-semibold tabular-nums">{DEMO_LIVE.batteryV} V</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-2">
            <Leaf className="mx-auto size-4 text-success" />
            <p className="mt-1 text-sm font-semibold tabular-nums">{DEMO_LIVE.ecoScore}</p>
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <DemoMap className="h-40" variant="trip" />
        <div className="flex items-start gap-2 p-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">{DEMO_LIVE.address}</p>
        </div>
      </section>

      <section className="card-surface p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="size-4 text-primary" /> Manutenção
        </h4>
        <div className="mt-2 space-y-2">
          {DEMO_MAINTENANCE.map((m) => (
            <div key={m.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <span className={cn("font-medium tabular-nums", toneClass[m.tone])}>{m.dueAt}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" /> Documentos
        </h4>
        <div className="mt-2 space-y-2">
          {DEMO_DOCS.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{d.label}</span>
              <span className={cn("font-medium", toneClass[d.tone])}>{d.dueAt}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ViagensScreen() {
  return (
    <div className="space-y-3">
      <ScreenHeader title="Viagens" subtitle="histórico automático ao ligar e desligar" />
      <section className="card-surface overflow-hidden">
        <DemoMap className="h-44" variant="trip" />
        <div className="p-3">
          <p className="font-semibold">{DEMO_TRIPS[0].title}</p>
          <p className="text-xs text-muted-foreground">
            {DEMO_TRIPS[0].date} · {DEMO_TRIPS[0].startedAt} às {DEMO_TRIPS[0].endedAt}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Row label="Distância" value={`${DEMO_TRIPS[0].distanceKm.toFixed(1)} km`} />
            <Row label="Duração" value={`${DEMO_TRIPS[0].durationMin} min`} />
            <Row label="Média" value={`${DEMO_TRIPS[0].avgSpeedKmh} km/h`} />
            <Row label="Máxima" value={`${DEMO_TRIPS[0].maxSpeedKmh} km/h`} />
            <Row label="Combustível" value={`${DEMO_TRIPS[0].liters.toFixed(2)} L`} />
            <Row label="Custo" value={brl(DEMO_TRIPS[0].cost)} strong />
          </div>
        </div>
      </section>

      {DEMO_TRIPS.slice(1).map((t) => (
        <article key={t.id} className="card-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.date} · {t.startedAt}–{t.endedAt}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Eco {t.ecoScore}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">{t.distanceKm.toFixed(1)} km</span>
            <span className="tabular-nums">{t.durationMin} min</span>
            <span className="tabular-nums">{t.liters.toFixed(2)} L</span>
            <span className="font-semibold tabular-nums text-foreground">{brl(t.cost)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function RelatorioScreen() {
  const max = Math.max(...DEMO_REPORT.byDay.map((d) => d.km));
  return (
    <div className="space-y-3">
      <ScreenHeader title="Relatório da semana" subtitle={DEMO_REPORT.period} />

      <section className="card-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Rodados</p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {DEMO_REPORT.distanceKm.toFixed(0)} km
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Gasto</p>
            <p className="font-display text-2xl font-bold tabular-nums text-primary">
              {brl(DEMO_REPORT.cost)}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Row label="Viagens" value={`${DEMO_REPORT.trips}`} />
          <Row label="Horas ao volante" value={`${DEMO_REPORT.hoursDriving} h`} />
          <Row label="Consumo médio" value={`${DEMO_REPORT.kmpl} km/L`} />
          <Row label="Custo por km" value={brl(DEMO_REPORT.costPerKm)} />
        </div>
      </section>

      <section className="card-surface p-4">
        <h4 className="text-sm font-semibold">Km por dia</h4>
        <div className="mt-3 flex h-28 items-end gap-2">
          {DEMO_REPORT.byDay.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary"
                style={{ height: `${(d.km / max) * 100}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Leaf className="size-4 text-success" /> Eco Score
          </h4>
          <span className="text-xs font-semibold text-success">
            +{DEMO_REPORT.ecoDelta} vs. semana anterior
          </span>
        </div>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-success">
          {DEMO_REPORT.ecoScore}
        </p>
        <div className="mt-3 space-y-1.5">
          <Row label="Frenagens bruscas" value={`${DEMO_REPORT.harshBrakes}`} />
          <Row label="Acelerações agressivas" value={`${DEMO_REPORT.harshAccels}`} />
          <Row label="Excessos de velocidade" value={`${DEMO_REPORT.speeding}`} />
        </div>
      </section>
    </div>
  );
}

function AbastecerScreen() {
  const last = DEMO_FUEL_LOGS[0];
  return (
    <div className="space-y-3">
      <ScreenHeader title="Abastecimentos" subtitle="controle de litros, preço e km/L real" />

      <section className="card-surface p-4">
        <h4 className="text-sm font-semibold">Novo abastecimento</h4>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Litros</p>
              <p className="font-display text-lg font-bold tabular-nums">32,40</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">R$ / litro</p>
              <p className="font-display text-lg font-bold tabular-nums">6,09</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Odômetro</p>
            <p className="font-display text-lg font-bold tabular-nums">38.150 km</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
            <Camera className="size-4 text-primary" /> Anexar foto da bomba ou nota fiscal
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-lg font-bold tabular-nums text-primary">
              {brl(last.total)}
            </span>
          </div>
        </div>
      </section>

      <section className="card-surface p-4">
        <h4 className="text-sm font-semibold">Últimos registros</h4>
        <div className="mt-2 divide-y divide-border/60">
          {DEMO_FUEL_LOGS.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium leading-tight">{f.station}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {f.date} · {f.liters.toFixed(1)} L · {brl(f.pricePerLiter)}/L
                  {f.full ? " · tanque cheio" : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{brl(f.total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Check className="size-4 text-success" /> Consumo real médio
          </span>
          <span className="font-display font-bold tabular-nums text-primary">12,7 km/L</span>
        </div>
      </section>
    </div>
  );
}

function RastreioScreen() {
  return (
    <div className="space-y-3">
      <ScreenHeader title="Rastreador" subtitle={DEMO_TRACKER.status} />
      <section className="card-surface overflow-hidden">
        <DemoMap className="h-56" variant="tracker" />
        <div className="space-y-2 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">{DEMO_TRACKER.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/30 p-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Distância de você</p>
              <p className="font-display text-lg font-bold tabular-nums">
                {DEMO_TRACKER.distanceFromMeKm} km
              </p>
            </div>
            <div className="rounded-xl bg-muted/30 p-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Chegada</p>
              <p className="font-display text-lg font-bold tabular-nums">
                {DEMO_TRACKER.etaMin} min
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-primary" /> Linha do tempo
        </h4>
        <ol className="mt-3 space-y-3">
          {DEMO_TRACKER.events.map((e) => (
            <li key={e.at} className="flex gap-3 text-sm">
              <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {e.at}
              </span>
              <span className={cn("size-2 shrink-0 translate-y-1.5 rounded-full", {
                "bg-success": e.tone === "ok",
                "bg-warning": e.tone === "warn",
                "bg-primary": e.tone === "info",
              })} />
              <span className="text-muted-foreground">{e.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card-surface p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Navigation className="size-4 text-primary" /> Último ponto estacionado
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">{DEMO_TRACKER.lastParked}</p>
      </section>
    </div>
  );
}

const SCREEN_MAP: Record<DemoScreenId, () => React.ReactElement> = {
  painel: PainelScreen,
  viagens: ViagensScreen,
  relatorio: RelatorioScreen,
  abastecer: AbastecerScreen,
  rastreio: RastreioScreen,
};

/** Renderiza uma das telas de demonstração com dados fictícios. */
export function DemoScreen({ id }: { id: DemoScreenId }) {
  const Screen = SCREEN_MAP[id];
  return <Screen />;
}
