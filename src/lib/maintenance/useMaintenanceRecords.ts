// Consulta única de manutenções, antes copiada em três telas.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MaintenanceRecord } from "@/lib/maintenance/rules";

export const MAINTENANCE_SELECT =
  "id,type,title,service_date,mileage_at_service,interval_km,interval_months,cost,workshop,notes,file_path";

export const MAINTENANCE_KEY = ["maintenance"] as const;

export async function fetchMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select(MAINTENANCE_SELECT)
    .order("service_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MaintenanceRecord[];
}

export function useMaintenanceRecords() {
  return useQuery<MaintenanceRecord[]>({
    queryKey: MAINTENANCE_KEY,
    queryFn: fetchMaintenanceRecords,
    staleTime: 60_000,
  });
}
