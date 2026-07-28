import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DOCS_BUCKET } from "@/lib/docs/storage";
import type { DriverSafeStartRow, DriverTripRow } from "./score";

export interface DriverRow {
  id: string;
  name: string;
  phone: string | null;
  photo_path: string | null;
  license_number: string | null;
  license_category: string | null;
  license_expires_on: string | null;
  is_default: boolean;
}

export const DRIVER_COLUMNS =
  "id,name,phone,photo_path,license_number,license_category,license_expires_on,is_default";

const TRIP_COLUMNS =
  "id,start_time,end_time,distance_km,fuel_liters,estimated_cost,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count,high_rpm_count,idle_seconds,wasted_fuel_liters,wasted_cost,max_speed_kmh";

/** URL assinada da foto do motorista (bucket privado). */
export async function driverPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function useDriverPhoto(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["driver-photo", path],
    queryFn: () => driverPhotoUrl(path ?? null),
    enabled: !!path,
    staleTime: 50 * 60_000,
  });
  return data ?? null;
}

export function useDrivers() {
  return useQuery<DriverRow[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(DRIVER_COLUMNS)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as DriverRow[];
    },
  });
}

export function useDriver(id: string) {
  return useQuery<DriverRow | null>({
    queryKey: ["driver", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(DRIVER_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as DriverRow) ?? null;
    },
  });
}

export function useDriverTrips(driverId: string) {
  return useQuery<DriverTripRow[]>({
    queryKey: ["driver-trips", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_COLUMNS)
        .eq("driver_id", driverId)
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DriverTripRow[];
    },
  });
}

export function useDriverSafeStarts(driverId: string) {
  return useQuery<DriverSafeStartRow[]>({
    queryKey: ["driver-safe-starts", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safe_starts")
        .select("started_at,required,ready,min_rpm")
        .eq("driver_id", driverId)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DriverSafeStartRow[];
    },
  });
}

/** Motorista marcado como padrão — usado para vincular viagens e partidas. */
export async function getDefaultDriverId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Vincula viagens e partidas ainda sem condutor ao motorista informado. */
export async function backfillDriverLinks(userId: string, driverId: string) {
  await supabase
    .from("trips")
    .update({ driver_id: driverId })
    .eq("user_id", userId)
    .is("driver_id", null);
  await supabase
    .from("safe_starts")
    .update({ driver_id: driverId })
    .eq("user_id", userId)
    .is("driver_id", null);
}
