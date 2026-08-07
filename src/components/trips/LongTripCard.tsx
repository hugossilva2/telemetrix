import { useMemo } from "react";
import { Coffee, Fuel, Gauge, Route as RouteIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDecimal } from "@/lib/format";
import { formatDurationSeconds, formatTime } from "@/lib/trips/format";
import {
  AUTONOMY_CLASS,
  AUTONOMY_LABEL,
  buildLongTripSummary,
  type LongTripSummary,
} from "@/lib/trips/longTrip";
import { useActiveVehicle } from "@/lib/vehicles/active";
import type { TripPlan } from "@/lib/trips/plan";
import type { FuelKind } from "@/lib/vehicles/specs";

export function useLongTripSummary({
  plan,
  fuelPercent,
  kmpl,
  fuel,
}: {
  plan: TripPlan | null;
  fuelPercent: number | null;
  kmpl?: number | null;
  fuel?: FuelKind;
}): LongTripSummary | null {
  const { spec } = useActiveVehicle();
  return useMemo(() => {
    if (!plan) return null;
    return buildLongTripSummary({
      path: plan.path,
      distanceKm: plan.distanceKm,
      durationSeconds: plan.durationSeconds,
      fuelPercent,
      kmpl: kmpl ?? null,
      fuel: fuel ?? "misto",
      departureISO: new Date().toISOString(),
      spec,
    });
  }, [plan, fuelPercent, kmpl, fuel, spec]);
}

/** Card de viagem longa: autonomia, reabastecimento e paradas de descanso. */
export function LongTripCard({
  summary,
  distanceKm,
  fuelPercent,
  fuelFromTelemetry,
  onFuelPercentChange,
}: {
  summary: LongTripSummary;
  distanceKm: number;
  fuelPercent: number | null;
  fuelFromTelemetry: boolean;
  onFuelPercentChange: (value: number) => void;
}) {
  const { spec } = useActiveVehicle();
  const liters = fuelPercent != null ? (fuelPercent / 100) * spec.tankL : null;

  return (
    <section className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <RouteIcon className="size-4" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Modo viagem longa</p>
            <p className="text-xs text-muted-foreground">
              Autonomia, reabastecimento e descanso a cada 2 h
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${AUTONOMY_CLASS[summary.level]}`}
        >
          {AUTONOMY_LABEL[summary.level]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-background/40 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-3.5 text-primary" />
            <span className="truncate">Autonomia estimada</span>
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {summary.autonomy != null ? `${formatDecimal(summary.autonomy)} km` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <RouteIcon className="size-3.5 text-primary" />
            <span className="truncate">Trajeto</span>
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatDecimal(distanceKm)} km
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-medium">
            <Fuel className="size-3.5 text-warning" /> Tanque atual
          </span>
          <span className="tabular-nums text-muted-foreground">
            {fuelPercent != null ? `${Math.round(fuelPercent)}%` : "—"}
            {liters != null ? ` · ${formatDecimal(liters)} L` : ""}
          </span>
        </div>
        {fuelFromTelemetry ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Lido do veículo em tempo real ({spec.tankL} L de tanque).
          </p>
        ) : (
          <>
            <Slider
              className="mt-3"
              value={[fuelPercent ?? 50]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => onFuelPercentChange(v[0] ?? 50)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sem leitura de nível pelo adaptador: ajuste manualmente quanto há no tanque.
            </p>
          </>
        )}
      </div>

      {summary.refuel && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <span className="font-semibold">Reabasteça em ~{formatDecimal(summary.refuel.km)} km</span>{" "}
          — o tanque atual não cobre o trajeto inteiro (faltam{" "}
          {formatDecimal(Math.max(0, distanceKm - summary.refuel.km))} km depois desse ponto).
        </p>
      )}

      {summary.rests.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium">Paradas de descanso sugeridas</p>
          <ul className="mt-2 space-y-2">
            {summary.rests.map((stop) => (
              <li key={stop.index} className="flex gap-2 rounded-xl bg-muted/40 p-3">
                <Coffee className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    Parada {stop.index} · {formatDurationSeconds(stop.atSeconds)} de viagem
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ~{formatDecimal(stop.km)} km
                    {stop.etaISO ? ` · previsto ${formatTime(stop.etaISO)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Base de consumo: {formatDecimal(summary.kmpl)} km/L · reserva de 10% do tanque não é
        considerada na autonomia.
      </p>
    </section>
  );
}
