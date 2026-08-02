import { Coffee, Fuel, Route as RouteIcon } from "lucide-react";
import { useLongTripLive } from "@/hooks/useLongTripMonitor";
import { formatDurationSeconds } from "@/lib/trips/format";
import { formatDecimal } from "@/lib/format";

const FUEL_CLASS: Record<string, string> = {
  ok: "text-success",
  atencao: "text-warning",
  critico: "text-destructive",
  desconhecido: "text-muted-foreground",
};

const FUEL_LABEL: Record<string, string> = {
  ok: "Autonomia folgada",
  atencao: "Autonomia justa",
  critico: "Reabastecer já",
  desconhecido: "Tanque sem leitura",
};

/** Faixa ao vivo da viagem longa: restante da rota, autonomia e próximo descanso. */
export function LongTripLiveStrip() {
  const live = useLongTripLive();
  if (!live.active) return null;

  return (
    <div className="grid grid-cols-3 gap-2 border-t border-success/20 px-3 py-2 text-xs">
      <Item
        icon={<RouteIcon className="size-3.5 text-primary" />}
        label="Restam"
        value={live.remainingKm != null ? `${formatDecimal(live.remainingKm)} km` : "—"}
      />
      <Item
        icon={<Fuel className="size-3.5 text-warning" />}
        label={FUEL_LABEL[live.fuel]}
        value={live.autonomyKm != null ? `${formatDecimal(live.autonomyKm)} km` : "—"}
        valueClass={FUEL_CLASS[live.fuel]}
      />
      <Item
        icon={<Coffee className="size-3.5 text-primary" />}
        label="Próx. descanso"
        value={formatDurationSeconds(live.secondsToRest)}
      />
    </div>
  );
}

function Item({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}
