import { GaugeRing } from "./GaugeRing";

interface Props {
  speedKmh?: number;
  rpm?: number;
  /** Nível de combustível em % (0-100). */
  fuelPct?: number;
  /** Capacidade do tanque, para estimar litros. */
  tankLiters?: number | null;
  ecoRpmMin?: number | null;
  ecoRpmMax?: number | null;
  ignitionOn: boolean;
}

const SPEED_MAX = 180;
const RPM_MAX = 6000;
const RPM_REDLINE = 4500;

/** Quadro de instrumentos: velocidade, RPM e combustível em anéis neon. */
export function GaugeCluster({
  speedKmh,
  rpm,
  fuelPct,
  tankLiters,
  ecoRpmMin,
  ecoRpmMax,
  ignitionOn,
}: Props) {
  const off = !ignitionOn;
  const speed = off ? undefined : speedKmh;
  const revs = off ? undefined : rpm;
  const fuel = off ? undefined : fuelPct;

  const liters =
    fuel !== undefined && tankLiters ? (tankLiters * Math.max(0, Math.min(100, fuel))) / 100 : null;

  const ecoFrom = ecoRpmMin ?? 1500;
  const ecoTo = ecoRpmMax ?? 2500;

  return (
    <section className="card-surface p-4">
      <div className="grid grid-cols-3 gap-2">
        <GaugeRing
          label="Velocidade"
          value={speed}
          max={SPEED_MAX}
          arcClassName="text-primary"
          dimmed={off}
        >
          <span className="num block text-2xl font-semibold">
            {speed === undefined ? "—" : Math.round(speed)}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">km/h</span>
        </GaugeRing>

        <GaugeRing
          label="RPM"
          value={revs}
          max={RPM_MAX}
          arcClassName={revs !== undefined && revs >= RPM_REDLINE ? "text-destructive" : "text-warning"}
          zones={[
            { from: ecoFrom, to: ecoTo, className: "text-success" },
            { from: RPM_REDLINE, to: RPM_MAX, className: "text-destructive" },
          ]}
          dimmed={off}
        >
          <span className="num block text-2xl font-semibold">
            {revs === undefined ? "—" : Math.round(revs).toLocaleString("pt-BR")}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">rpm</span>
        </GaugeRing>

        <GaugeRing
          label="Combustível"
          value={fuel}
          max={100}
          arcClassName={fuel !== undefined && fuel < 15 ? "text-warning" : "text-success"}
          dimmed={off}
        >
          <span className="num block text-2xl font-semibold">
            {fuel === undefined ? "—" : `${Math.round(fuel)}%`}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {liters != null ? `${liters.toFixed(0)} L` : "sem dado"}
          </span>
        </GaugeRing>
      </div>
      {off && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Mostradores ativos com o motor ligado.
        </p>
      )}
    </section>
  );
}
