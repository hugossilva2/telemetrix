import { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { gradeLive, bandFromScore } from "@/lib/eco/live";
import { getEcoSettings } from "@/lib/eco/settings";
import { useActiveVehicle } from "@/lib/vehicles/active";

/**
 * Nota de desempenho ao vivo (Ótimo/Bom/Regular/Péssimo) calibrada pela ficha
 * técnica do veículo: faixa econômica de giro, aceleração de fábrica e limite
 * de velocidade. Também acumula a média da viagem até agora.
 */
export function LivePerformanceBadge() {
  const { telemetry } = useTelemetry();
  const { spec } = useActiveVehicle();
  const speed = telemetry.canSpeedKmh ?? telemetry.speedKmh ?? null;
  const rpm = telemetry.engineRpm ?? null;
  const load = telemetry.engineLoad ?? null;

  const prev = useRef<{ t: number; speed: number } | null>(null);
  const acc = useRef({ sum: 0, n: 0 });
  const [state, setState] = useState<{ score: number; hint: string | null; avg: number | null }>({
    score: 100,
    hint: null,
    avg: null,
  });

  useEffect(() => {
    if (speed == null) return;
    const now = Date.now();
    const last = prev.current;
    const dt = last ? (now - last.t) / 1000 : 0;
    const accel = last && dt >= 1 && dt <= 30 ? (speed - last.speed) / dt : null;
    prev.current = { t: now, speed };

    const th = getEcoSettings().thresholds;
    const { score, hint } = gradeLive({
      rpm,
      speedKmh: speed,
      accelKmhPerS: accel,
      load,
      spec,
      maxSpeedKmh: th.maxSpeedKmh,
    });

    acc.current.sum += score;
    acc.current.n += 1;
    setState({ score, hint, avg: acc.current.sum / acc.current.n });
  }, [speed, rpm, load, spec]);

  const band = bandFromScore(state.score);
  const avgBand = bandFromScore(state.avg == null ? null : Math.round(state.avg));

  return (
    <div className="border-t border-success/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Gauge className="size-3.5" /> Desempenho agora
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${band.border} ${band.bg} ${band.color}`}
        >
          {band.label} · {state.score}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${band.bg.replace("/10", "")}`}
          style={{ width: `${state.score}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate text-muted-foreground">
          {state.hint ?? "Giro e aceleração dentro da faixa ideal do 1.3 Firefly"}
        </span>
        {state.avg != null && (
          <span className={`shrink-0 font-semibold tabular-nums ${avgBand.color}`}>
            média {Math.round(state.avg)}
          </span>
        )}
      </div>
    </div>
  );
}
