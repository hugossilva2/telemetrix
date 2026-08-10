import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useActiveVehicle, VEHICLES_QUERY_KEY } from "@/lib/vehicles/active";

/** Só grava quando o odômetro avançou pelo menos isso. */
const MIN_DELTA_KM = 1;
/** Intervalo mínimo entre gravações. */
const MIN_INTERVAL_MS = 5 * 60_000;

/**
 * Mantém `vehicles.current_mileage` em dia com o odômetro lido da telemetria,
 * para que a estimativa de tanque e os alertas de manutenção não fiquem
 * atrasados quando o app não está aberto.
 */
export function useOdometerSync() {
  const { telemetry } = useTelemetry();
  const { vehicle } = useActiveVehicle();
  const qc = useQueryClient();
  const lastWrite = useRef(0);

  const mileage = Number(telemetry.mileageKm);
  const vehicleId = vehicle?.id ?? null;
  const stored = Number(vehicle?.current_mileage);

  useEffect(() => {
    if (!vehicleId || !Number.isFinite(mileage) || mileage <= 0) return;
    if (Number.isFinite(stored) && mileage - stored < MIN_DELTA_KM) return;
    const now = Date.now();
    if (now - lastWrite.current < MIN_INTERVAL_MS) return;
    lastWrite.current = now;

    void (async () => {
      const { error } = await supabase
        .from("vehicles")
        .update({ current_mileage: Math.round(mileage) })
        .eq("id", vehicleId);
      if (!error) qc.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    })();
  }, [vehicleId, mileage, stored, qc]);
}
