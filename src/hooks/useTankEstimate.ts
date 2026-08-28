import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { useTelemetry } from "@/hooks/useTelemetry";
import { expectedKmpl } from "@/lib/vehicles/specs";
import {
  estimateTank,
  historicalKmpl,
  type FuelFill,
  type TankAnchor,
  type TankEstimate,
} from "@/lib/eco/tankEstimate";

const ANCHOR_PREFIX = "telemetrix.tankAnchor.";

function readAnchor(vehicleId: string | null): TankAnchor | null {
  if (!vehicleId) return null;
  try {
    const raw = localStorage.getItem(ANCHOR_PREFIX + vehicleId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TankAnchor;
    if (typeof parsed?.liters !== "number" || typeof parsed?.odometerKm !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface UseTankEstimate {
  estimate: TankEstimate | null;
  anchor: TankAnchor | null;
  /** km/l usado na conta (histórico dos abastecimentos ou ficha do veículo). */
  kmpl: number;
  kmplSource: "abastecimentos" | "veiculo";
  odometerKm: number | null;
  /** Grava uma nova calibração do tanque com o odômetro atual. */
  calibrate: (liters: number) => void;
  clear: () => void;
}

/**
 * Nível do tanque estimado pelos abastecimentos + km rodados, para veículos
 * que não expõem o nível de combustível pelo OBD-II.
 */
export function useTankEstimate(): UseTankEstimate {
  const { vehicle, vehicleId, spec, fuel } = useActiveVehicle();
  const { telemetry } = useTelemetry();
  const [anchor, setAnchor] = useState<TankAnchor | null>(null);

  useEffect(() => {
    setAnchor(readAnchor(vehicleId));
  }, [vehicleId]);

  const { data: fills = [] } = useQuery({
    queryKey: ["tank-fills", vehicleId],
    staleTime: 60_000,
    queryFn: async (): Promise<FuelFill[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("date,liters_filled,mileage_at_fill")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.date as string,
        liters: Number(r.liters_filled) || 0,
        odometerKm:
          r.mileage_at_fill != null && Number(r.mileage_at_fill) > 0
            ? Number(r.mileage_at_fill)
            : null,
      }));
    },
  });

  const odometerKm = useMemo(() => {
    const fromVehicle = Number(vehicle?.current_mileage);
    const fromTelemetry = Number(telemetry.mileageKm);
    // Abastecimentos costumam ter o odômetro mais recente que o cadastro.
    const fromFills = fills.map((f) => Number(f.odometerKm));
    const candidates = [fromVehicle, fromTelemetry, ...fromFills].filter(
      (n) => Number.isFinite(n) && n > 0,
    );
    return candidates.length > 0 ? Math.max(...candidates) : null;
  }, [vehicle?.current_mileage, telemetry.mileageKm, fills]);


  const historical = useMemo(() => historicalKmpl(fills), [fills]);
  const fallbackKmpl = useMemo(() => {
    const avg = Number(vehicle?.avg_consumption_kmpl);
    if (Number.isFinite(avg) && avg > 0) return avg;
    return expectedKmpl({ fuel, spec });
  }, [vehicle?.avg_consumption_kmpl, fuel, spec]);

  const kmpl = historical ?? fallbackKmpl;

  const estimate = useMemo(
    () => estimateTank({ anchor, fills, odometerKm, kmpl, tankL: spec.tankL }),
    [anchor, fills, odometerKm, kmpl, spec.tankL],
  );

  const calibrate = useCallback(
    (liters: number) => {
      if (!vehicleId || odometerKm == null) return;
      const next: TankAnchor = {
        liters: Math.max(0, Math.min(spec.tankL, liters)),
        odometerKm,
        at: new Date().toISOString(),
      };
      setAnchor(next);
      try {
        localStorage.setItem(ANCHOR_PREFIX + vehicleId, JSON.stringify(next));
      } catch {
        /* storage indisponível */
      }
    },
    [vehicleId, odometerKm, spec.tankL],
  );

  const clear = useCallback(() => {
    setAnchor(null);
    if (!vehicleId) return;
    try {
      localStorage.removeItem(ANCHOR_PREFIX + vehicleId);
    } catch {
      /* storage indisponível */
    }
  }, [vehicleId]);

  return {
    estimate,
    anchor,
    kmpl,
    kmplSource: historical != null ? "abastecimentos" : "veiculo",
    odometerKm,
    calibrate,
    clear,
  };
}
