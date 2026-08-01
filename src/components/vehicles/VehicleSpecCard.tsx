import { Gauge, Car, Fuel, Settings2 } from "lucide-react";
import { ACTIVE_SPEC, expectedKmpl, type FuelKind } from "@/lib/vehicles/specs";

const spec = ACTIVE_SPEC;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Ficha técnica que calibra os scores, limites de evento e metas de consumo. */
export function VehicleSpecCard({ fuel = "misto" }: { fuel?: FuelKind }) {
  const urbanTarget = expectedKmpl({ fuel, avgSpeedKmh: 30 });
  const highwayTarget = expectedKmpl({ fuel, avgSpeedKmh: 90 });

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
          <Car className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-sm font-semibold tracking-tight">
            {spec.name} {spec.year}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {spec.engine} · {spec.gearbox}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border/70 bg-background/35 p-2">
          <p className="text-sm font-semibold tabular-nums">
            {spec.powerCvEthanol}/{spec.powerCvGasoline}
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground">cv (E/G)</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/35 p-2">
          <p className="text-sm font-semibold tabular-nums">
            {spec.torqueKgfmEthanol.toFixed(1)}
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground">
            kgfm @ {spec.torqueRpm}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/35 p-2">
          <p className="text-sm font-semibold tabular-nums">{spec.zeroTo100S}s</p>
          <p className="text-[10px] leading-tight text-muted-foreground">0-100 km/h</p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Fuel className="size-3.5" /> Metas de consumo
        </p>
        <Row label="Urbano (meta)" value={`${urbanTarget.toFixed(1)} km/l`} />
        <Row label="Rodoviário (meta)" value={`${highwayTarget.toFixed(1)} km/l`} />
        <Row label="Tanque" value={`${spec.tankL} L`} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Gauge className="size-3.5" /> Faixas usadas nos scores
        </p>
        <Row label="Giro econômico" value={`${spec.ecoRpm.min}-${spec.ecoRpm.max} rpm`} />
        <Row
          label="Aceleração de fábrica"
          value={`${(100 / spec.zeroTo100S).toFixed(1)} km/h/s`}
        />
        <Row label="Velocidade máxima" value={`${spec.topSpeedKmh} km/h`} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Settings2 className="size-3.5" /> Mecânica e dimensões
        </p>
        <Row label="Freios" value={`${spec.brakesFront} / ${spec.brakesRear}`} />
        <Row label="Suspensão" value={`${spec.suspensionFront.split(" com")[0]} / eixo de torção`} />
        <Row label="Pneus" value={`${spec.tires} (aro ${spec.wheels.split("x ")[1] ?? "15\""})`} />
        <Row label="Peso em ordem de marcha" value={`${spec.curbWeightKg} kg`} />
        <Row label="Porta-malas" value={`${spec.trunkL} L`} />
        <Row
          label="Dimensões"
          value={`${spec.lengthMm} × ${spec.widthMm} × ${spec.heightMm} mm`}
        />
      </div>
    </div>
  );
}
