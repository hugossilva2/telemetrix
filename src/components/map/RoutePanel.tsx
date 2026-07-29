import { Clock, Flag, Navigation, Route as RouteIcon, X } from "lucide-react";
import type { PlannedRoute } from "@/components/map/PlannedRouteLayer";

function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}min`;
}

function arrivalTime(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  route: PlannedRoute;
  started?: boolean;
  ignitionOn?: boolean;
  onStart: () => void;
  onCancel: () => void;
}

/** Painel inferior com ETA, distância e ações da rota planejada. */
export function RoutePanel({ route, started, ignitionOn, onStart, onCancel }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-2">
        <Flag className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{route.destination.name}</p>
          {route.destination.address && (
            <p className="truncate text-xs text-muted-foreground">{route.destination.address}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Cancelar rota"
          onClick={onCancel}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/50 px-2 py-1.5">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3" /> Tempo
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {formatDuration(route.durationSeconds)}
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 px-2 py-1.5">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <RouteIcon className="size-3" /> Distância
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {(route.distanceMeters / 1000).toFixed(1)} km
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Chegada</div>
          <div className="text-sm font-semibold tabular-nums">
            {arrivalTime(route.durationSeconds)}
          </div>
        </div>
      </div>

      {started ? (
        <p className="mt-3 text-center text-xs text-success">
          {ignitionOn
            ? "Viagem em monitoramento até o destino."
            : "Destino salvo — a viagem começa ao ligar o carro."}
        </p>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Navigation className="size-4" /> Iniciar viagem
        </button>
      )}
    </div>
  );
}
