import { Fuel, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useOpenTrip } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";
import { supabase } from "@/integrations/supabase/client";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function LiveConsumptionCard() {
  const open = useOpenTrip();

  const { data } = useQuery({
    queryKey: ["live-consumption-refs"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { pricePerLiter: null, kmpl: 10 };
      const [{ data: vehicle }, { data: lastFuel }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("avg_consumption_kmpl")
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("fuel_logs")
          .select("price_per_liter")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        pricePerLiter: lastFuel?.price_per_liter ?? null,
        kmpl: Number(vehicle?.avg_consumption_kmpl) || 10,
      };
    },
    staleTime: 60_000,
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

  const DEFAULT_PRICE = 6.0;
  const kmpl = data?.kmpl ?? 10;
  const priceFromLog = data?.pricePerLiter != null ? Number(data.pricePerLiter) : null;
  const price = priceFromLog ?? DEFAULT_PRICE;
  const usingFallbackPrice = priceFromLog === null;
  const liters = distanceKm !== null ? distanceKm / kmpl : null;
  const cost = liters !== null ? liters * price : null;

  return (
    <div className="col-span-2 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Fuel className="size-3.5" />
          Consumo em tempo real
        </div>
        <div className="text-[10px] text-muted-foreground">
          {kmpl.toFixed(1)} km/L · {BRL.format(price)}/L
        </div>
      </div>

      {!open ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aguardando o início de uma viagem…
        </p>
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
            <div className="text-xl font-semibold tabular-nums text-emerald-500">
              {cost !== null ? BRL.format(cost) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {usingFallbackPrice ? "preço padrão — cadastre um abastecimento" : "com base no último preço"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
