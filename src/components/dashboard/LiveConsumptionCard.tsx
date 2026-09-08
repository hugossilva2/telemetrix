import { Fuel, DollarSign } from "lucide-react";
import { useOpenTrip } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { tripFuelLiters } from "@/lib/fuel/consumption";
import { useFuelRefs } from "@/lib/fuel/useFuelRefs";
import { FuelSourceBadge } from "@/components/fuel/FuelSourceBadge";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function LiveConsumptionCard() {
  const open = useOpenTrip();
  const { vehicle, spec, fuel } = useActiveVehicle();

  const { pricePerLiter: price, hasPriceFromLog, kmpl, source } = useFuelRefs(vehicle?.id, fuel, {
    vehicleKmpl: vehicle?.avg_consumption_kmpl ?? null,
    spec,
    avgSpeedKmh: null,
  });

  let distanceKm: number | null = null;
  if (open) {
    if (
      typeof open.mileageAtStart === "number" &&
      typeof open.lastMileage === "number" &&
      open.lastMileage >= open.mileageAtStart
    ) {
      distanceKm = open.lastMileage - open.mileageAtStart;
    } else if (
      typeof open.startLat === "number" &&
      typeof open.startLng === "number" &&
      typeof open.lastLat === "number" &&
      typeof open.lastLng === "number"
    ) {
      distanceKm = haversineKm(open.startLat, open.startLng, open.lastLat, open.lastLng);
    }
  }

  const usingFallbackPrice = !hasPriceFromLog;

  const liters =
    distanceKm !== null
      ? tripFuelLiters({ distanceKm, kmpl, idleSeconds: open?.idleSeconds ?? 0 })
      : null;
  const cost = liters !== null ? liters * price : null;

  return (
    <div className="col-span-2 card-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Fuel className="size-3.5" />
          Consumo em tempo real
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <FuelSourceBadge source={source} />
          <span>
            {kmpl.toFixed(1)} km/L · {BRL.format(price)}/L
          </span>
        </div>
      </div>

      {!open ? (
        <p className="mt-3 text-sm text-muted-foreground">Aguardando o início de uma viagem…</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Combustível</div>
            <div className="text-xl font-semibold tabular-nums">
              {liters !== null ? `${liters.toFixed(2)} L` : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {distanceKm !== null ? `${distanceKm.toFixed(1)} km percorridos` : "sem distância"}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
              <DollarSign className="size-3" /> Custo estimado
            </div>
            <div className="text-xl font-semibold tabular-nums text-success">
              {cost !== null ? BRL.format(cost) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {usingFallbackPrice
                ? "preço padrão — cadastre um abastecimento"
                : "com base no último preço"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
