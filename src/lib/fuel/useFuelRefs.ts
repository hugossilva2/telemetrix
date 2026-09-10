// Referências de combustível compartilhadas: último preço pago + calibração do
// veículo, já resolvidas em km/L por resolveKmpl. Antes três telas repetiam a
// mesma consulta com chaves diferentes.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveKmpl, type FuelCalibrationRow, type FuelSource } from "@/lib/fuel/consumption";
import { DEFAULT_GAS_PRICE_PER_LITER } from "@/lib/trips/cost";
import type { FuelKind, VehicleSpec } from "@/lib/vehicles/specs";

export interface FuelRefs {
  /** Último preço por litro registrado; null quando não há abastecimento. */
  pricePerLiter: number | null;
  calibration: FuelCalibrationRow | null;
}

async function fetchFuelRefs(vehicleId: string | null, fuelKind: FuelKind): Promise<FuelRefs> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { pricePerLiter: null, calibration: null };

  const [{ data: lastFuel }, { data: calibration }] = await Promise.all([
    (() => {
      // Preço de referência do carro ativo; sem carro, o último preço da conta.
      let q = supabase.from("fuel_logs").select("price_per_liter").eq("user_id", uid);
      if (vehicleId) q = q.eq("vehicle_id", vehicleId);
      return q.order("date", { ascending: false }).limit(1).maybeSingle();
    })(),
    vehicleId
      ? supabase
          .from("vehicle_fuel_calibration")
          .select("kmpl,samples,fuel_type")
          .eq("vehicle_id", vehicleId)
          .eq("fuel_type", fuelKind)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const price = Number(lastFuel?.price_per_liter);
  return {
    pricePerLiter: Number.isFinite(price) && price > 0 ? price : null,
    calibration: (calibration as FuelCalibrationRow | null) ?? null,
  };
}

export function useFuelRefs(
  vehicleId: string | null | undefined,
  fuelKind: FuelKind,
  opts?: { vehicleKmpl?: number | string | null; spec?: VehicleSpec; avgSpeedKmh?: number | null },
): {
  pricePerLiter: number;
  hasPriceFromLog: boolean;
  calibration: FuelCalibrationRow | null;
  kmpl: number;
  source: FuelSource;
} {
  const id = vehicleId ?? null;
  const { data } = useQuery({
    queryKey: ["fuel-refs", id, fuelKind],
    queryFn: () => fetchFuelRefs(id, fuelKind),
    staleTime: 60_000,
  });

  const { kmpl, source } = resolveKmpl({
    calibration: data?.calibration ?? null,
    vehicleKmpl: opts?.vehicleKmpl ?? null,
    spec: opts?.spec,
    fuel: fuelKind,
    avgSpeedKmh: opts?.avgSpeedKmh ?? null,
  });

  return {
    pricePerLiter: data?.pricePerLiter ?? DEFAULT_GAS_PRICE_PER_LITER,
    hasPriceFromLog: data?.pricePerLiter != null,
    calibration: data?.calibration ?? null,
    kmpl,
    source,
  };
}
