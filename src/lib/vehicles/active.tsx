import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SPEC,
  parseFuelKind,
  specFromVehicleRow,
  type FuelKind,
  type VehicleSpec,
} from "@/lib/vehicles/specs";

const STORAGE_KEY = "telemetrix.activeVehicleId";

export interface VehicleRecord {
  id: string;
  name: string;
  plate: string;
  current_mileage: number;
  avg_consumption_kmpl: number;
  flespi_device_id: string | null;
  obd_device_name: string | null;
  tracker_mode: boolean;
  alert_engine_on: boolean;
  model_year: number | null;
  engine: string | null;
  gearbox: string | null;
  fuel_kind: string | null;
  tank_l: number | null;
  eco_rpm_min: number | null;
  eco_rpm_max: number | null;
  zero_to_100_s: number | null;
  consumption_ethanol_urban: number | null;
  consumption_ethanol_highway: number | null;
  consumption_gasoline_urban: number | null;
  consumption_gasoline_highway: number | null;
}

/** Lê o veículo ativo fora do React (ex.: salvamento de viagem). */
export function getActiveVehicleId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const VEHICLE_SELECT =
  "id,name,plate,current_mileage,avg_consumption_kmpl,flespi_device_id,obd_device_name,tracker_mode,alert_engine_on,model_year,engine,gearbox,fuel_kind,tank_l,eco_rpm_min,eco_rpm_max,zero_to_100_s,consumption_ethanol_urban,consumption_ethanol_highway,consumption_gasoline_urban,consumption_gasoline_highway";

export const VEHICLES_QUERY_KEY = ["vehicles", "list"] as const;

export async function fetchVehicles(): Promise<VehicleRecord[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VehicleRecord[];
}

interface ActiveVehicleValue {
  vehicles: VehicleRecord[];
  vehicle: VehicleRecord | null;
  vehicleId: string | null;
  spec: VehicleSpec;
  fuel: FuelKind;
  loading: boolean;
  setVehicleId: (id: string) => void;
}

const ActiveVehicleContext = createContext<ActiveVehicleValue>({
  vehicles: [],
  vehicle: null,
  vehicleId: null,
  spec: DEFAULT_SPEC,
  fuel: "misto",
  loading: true,
  setVehicleId: () => {},
});

/** Veículo ativo do usuário (multi-veículo), com ficha técnica derivada do banco. */
export function useActiveVehicle(): ActiveVehicleValue {
  return useContext(ActiveVehicleContext);
}

export function ActiveVehicleProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelectedId(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* storage indisponível */
    }
  }, []);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: VEHICLES_QUERY_KEY,
    queryFn: fetchVehicles,
    staleTime: 60_000,
  });

  const vehicle = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find((v) => v.id === selectedId) ?? vehicles[0] ?? null;
  }, [vehicles, selectedId]);

  const setVehicleId = (id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage indisponível */
    }
  };

  const value = useMemo<ActiveVehicleValue>(
    () => ({
      vehicles,
      vehicle,
      vehicleId: vehicle?.id ?? null,
      spec: specFromVehicleRow(vehicle),
      fuel: parseFuelKind(vehicle?.fuel_kind),
      loading: isLoading,
      setVehicleId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, vehicle, isLoading],
  );

  return <ActiveVehicleContext.Provider value={value}>{children}</ActiveVehicleContext.Provider>;
}

/** Invalida a lista de veículos depois de criar/editar/remover. */
export function useInvalidateVehicles() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    qc.invalidateQueries({ queryKey: ["vehicle-primary"] });
  };
}
