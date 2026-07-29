import { AlertTriangle, Fuel, Gauge, Timer, TrendingDown } from "lucide-react";
import type { EcoEvent, EcoEventType } from "@/lib/eco/detect";
import { ECO_EVENT_COLOR, ECO_EVENT_LABEL, ecoBand, formatIdle } from "@/lib/eco/score";
import { EcoScoreRing } from "./EcoScoreRing";
import { formatBRL, formatDecimal } from "@/lib/format";

export interface EcoTripData {
  eco_score: number | null;
  harsh_brake_count: number | null;
  harsh_accel_count: number | null;
  harsh_corner_count: number | null;
  overspeed_count: number | null;
  high_rpm_count: number | null;
  idle_seconds: number | null;
  wasted_fuel_liters: number | null;
  wasted_cost: number | null;
  eco_events: unknown;
}

export function parseEcoEvents(raw: unknown): EcoEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is EcoEvent =>
      !!e && typeof e === "object" && typeof (e as EcoEvent).type === "string",
  );
}

const ORDER: EcoEventType[] = [
  "harsh_brake",
  "harsh_accel",
  "harsh_corner",
  "overspeed",
  "high_rpm",
];

export function EcoTripCard({ trip }: { trip: EcoTripData }) {
  const events = parseEcoEvents(trip.eco_events);
  const band = ecoBand(trip.eco_score);
  const counts: Record<EcoEventType, number> = {
    harsh_brake: trip.harsh_brake_count ?? 0,
    harsh_accel: trip.harsh_accel_count ?? 0,
    harsh_corner: trip.harsh_corner_count ?? 0,
    overspeed: trip.overspeed_count ?? 0,
    high_rpm: trip.high_rpm_count ?? 0,
  };
  const total = ORDER.reduce((s, k) => s + counts[k], 0);

  if (trip.eco_score == null && total === 0 && !trip.idle_seconds) {
    return (
      <div className="card-surface p-4 text-sm text-muted-foreground">
        Esta viagem foi registrada antes da pontuação de direção. As próximas já
        virão com o Eco Score.
      </div>
    );
  }

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-4">
        <EcoScoreRing score={trip.eco_score} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${band.color}`}>
            Direção {band.label.toLowerCase()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total} evento(s) de direção agressiva
            {trip.idle_seconds ? ` · ${formatIdle(trip.idle_seconds)} em marcha lenta` : ""}
          </p>
          {(trip.wasted_fuel_liters ?? 0) > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">
              <Fuel className="size-3.5" />
              {formatDecimal(trip.wasted_fuel_liters ?? 0)} L desperdiçados ·{" "}
              {formatBRL(trip.wasted_cost ?? 0)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ORDER.map((type) => (
          <div key={type} className="rounded-xl border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className={`size-3 ${ECO_EVENT_COLOR[type]}`} />
              <span className="truncate">{ECO_EVENT_LABEL[type]}</span>
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{counts[type]}</div>
          </div>
        ))}
        <div className="rounded-xl border border-border/60 bg-background/40 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Timer className="size-3" /> Marcha lenta
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatIdle(trip.idle_seconds ?? 0)}
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {events.slice(-25).reverse().map((e, i) => (
            <li
              key={`${e.t}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-2 py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {e.type === "harsh_brake" ? (
                  <TrendingDown className={`size-3.5 shrink-0 ${ECO_EVENT_COLOR[e.type]}`} />
                ) : (
                  <Gauge className={`size-3.5 shrink-0 ${ECO_EVENT_COLOR[e.type]}`} />
                )}
                <span className="truncate">
                  {ECO_EVENT_LABEL[e.type]}
                  {e.severity === "severe" && (
                    <span className="ml-1 text-[10px] font-semibold text-destructive">severo</span>
                  )}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {new Date(e.t).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {Math.round(e.speedBefore)}→{Math.round(e.speedAfter)} km/h
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
