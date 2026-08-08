import { ArrowLeftRight, Fuel, RotateCcw, TicketMinus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, formatDecimal } from "@/lib/format";
import type { PlanCostResult } from "@/lib/trips/cost";
import { cn } from "@/lib/utils";

interface Props {
  cost: PlanCostResult;
  roundTrip: boolean;
  onRoundTripChange: (v: boolean) => void;
  tollCost: number;
  onTollCostChange: (v: number) => void;
  pricePerLiter: number;
  onPricePerLiterChange: (v: number) => void;
  kmpl: number;
  onKmplChange: (v: number) => void;
  onReset?: () => void;
  canReset?: boolean;
}

function parseNumber(raw: string, max: number) {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

export function TripCostCard({
  cost,
  roundTrip,
  onRoundTripChange,
  tollCost,
  onTollCostChange,
  pricePerLiter,
  onPricePerLiterChange,
  kmpl,
  onKmplChange,
  onReset,
  canReset,
}: Props) {
  return (
    <section className="card-surface p-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Wallet className="size-4 text-success" /> Estimativa de gastos
        </h2>
        {canReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            <RotateCcw className="size-3" /> Valores padrão
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-background/40 p-1">
        {[
          { label: "Só ida", value: false },
          { label: "Ida e volta", value: true },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onRoundTripChange(opt.value)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              roundTrip === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {opt.value && <ArrowLeftRight className="mr-1 inline size-3" />}
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Field label="R$/L">
          <Input
            inputMode="decimal"
            value={String(pricePerLiter)}
            onChange={(e) => onPricePerLiterChange(parseNumber(e.target.value, 100))}
          />
        </Field>
        <Field label="km/L">
          <Input
            inputMode="decimal"
            value={String(kmpl)}
            onChange={(e) => onKmplChange(parseNumber(e.target.value, 100))}
          />
        </Field>
        <Field label="Pedágios (R$)">
          <Input
            inputMode="decimal"
            value={String(tollCost)}
            onChange={(e) => onTollCostChange(parseNumber(e.target.value, 100000))}
          />
        </Field>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <Row
          icon={<Fuel className="size-4 text-warning" />}
          label={`Combustível · ${formatDecimal(cost.fuelLiters)} L`}
          value={formatBRL(cost.fuelCost)}
        />
        <Row
          icon={<TicketMinus className="size-4 text-muted-foreground" />}
          label="Pedágios"
          value={formatBRL(cost.tollCost)}
        />
        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total da viagem
          </dt>
          <dd className="text-lg font-semibold tabular-nums text-success">
            {formatBRL(cost.total)}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatDecimal(cost.distanceKm)} km {roundTrip ? "(ida e volta)" : "(só ida)"} ·{" "}
        {cost.costPerKm != null ? `${formatBRL(cost.costPerKm)}/km` : "—"}
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
