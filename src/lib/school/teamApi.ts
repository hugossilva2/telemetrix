import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VEHICLES_QUERY_KEY } from "@/lib/vehicles/active";
import { INVITES_KEY, type OrgRole } from "./api";

export const TEAM_KEY = ["school", "team"] as const;
export const FLEET_KEY = ["school", "fleet"] as const;
export const ASSIGN_KEY = ["school", "instructor-vehicles"] as const;
export const FLEET_TRIPS_KEY = ["school", "fleet-trips"] as const;

export interface TeamMember {
  user_id: string;
  role: OrgRole;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

export interface FleetVehicle {
  id: string;
  name: string;
  plate: string;
  user_id: string;
  org_id: string | null;
  current_mileage: number;
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada");
  return data.user.id;
}

/** Dono + instrutores da escola (nome/e-mail via função segura). */
export function useTeam(orgId: string | null | undefined) {
  return useQuery({
    queryKey: [...TEAM_KEY, orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase.rpc("org_team", { _org_id: orgId! });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

export function memberName(members: TeamMember[] | undefined, userId: string, fallback = "Instrutor"): string {
  const m = members?.find((x) => x.user_id === userId);
  return m?.display_name || m?.email || fallback;
}

/** Convite de instrutor (link), reaproveitando convite aberto com o mesmo e-mail. */
export function useCreateInstructorInvite(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email?: string | null }): Promise<string> => {
      if (!orgId) throw new Error("Escola não encontrada");
      const me = await uid();
      const email = input.email?.trim().toLowerCase() || null;
      const { data, error } = await supabase
        .from("organization_invites")
        .insert({ org_id: orgId, role: "instructor", email, created_by: me })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useRemoveMember(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!orgId) throw new Error("Escola não encontrada");
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .neq("role", "owner");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_KEY });
      qc.invalidateQueries({ queryKey: ASSIGN_KEY });
    },
  });
}

/** Carros da frota da escola (org_id = escola) + carros próprios do dono ainda fora da frota. */
export function useFleet(orgId: string | null | undefined) {
  return useQuery({
    queryKey: [...FLEET_KEY, orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<{ fleet: FleetVehicle[]; mine: FleetVehicle[] }> => {
      const me = await uid();
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,plate,user_id,org_id,current_mileage")
        .or(`org_id.eq.${orgId},user_id.eq.${me}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as FleetVehicle[];
      return {
        fleet: rows.filter((v) => v.org_id === orgId),
        mine: rows.filter((v) => v.user_id === me && v.org_id !== orgId),
      };
    },
  });
}

export function useSetVehicleInFleet(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { vehicleId: string; inFleet: boolean }) => {
      if (!orgId) throw new Error("Escola não encontrada");
      const { error } = await supabase
        .from("vehicles")
        .update({ org_id: input.inFleet ? orgId : null })
        .eq("id", input.vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FLEET_KEY });
      qc.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
  });
}

export interface Assignment {
  id: string;
  user_id: string;
  vehicle_id: string;
}

export function useAssignments(orgId: string | null | undefined) {
  return useQuery({
    queryKey: [...ASSIGN_KEY, orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from("instructor_vehicles")
        .select("id,user_id,vehicle_id")
        .eq("org_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleAssignment(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; vehicleId: string; on: boolean }) => {
      if (!orgId) throw new Error("Escola não encontrada");
      if (input.on) {
        const { error } = await supabase
          .from("instructor_vehicles")
          .upsert({ org_id: orgId, user_id: input.userId, vehicle_id: input.vehicleId }, { onConflict: "org_id,user_id,vehicle_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("instructor_vehicles")
          .delete()
          .eq("org_id", orgId)
          .eq("user_id", input.userId)
          .eq("vehicle_id", input.vehicleId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ASSIGN_KEY }),
  });
}

export interface FleetTripRow {
  id: string;
  vehicle_id: string | null;
  start_time: string;
  distance_km: number | null;
  fuel_liters: number | null;
  estimated_cost: number | null;
  eco_score: number | null;
}

/** Viagens dos carros da frota no período (para km/combustível por carro). */
export function useFleetTrips(vehicleIds: string[], from: Date, to: Date) {
  const key = vehicleIds.slice().sort().join(",");
  return useQuery({
    queryKey: [...FLEET_TRIPS_KEY, key, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    enabled: vehicleIds.length > 0,
    queryFn: async (): Promise<FleetTripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("id,vehicle_id,start_time,distance_km,fuel_liters,estimated_cost,eco_score")
        .in("vehicle_id", vehicleIds)
        .gte("start_time", from.toISOString())
        .lt("start_time", to.toISOString())
        .not("end_time", "is", null)
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((t) => ({
        ...t,
        distance_km: t.distance_km == null ? null : Number(t.distance_km),
        fuel_liters: t.fuel_liters == null ? null : Number(t.fuel_liters),
        estimated_cost: t.estimated_cost == null ? null : Number(t.estimated_cost),
        eco_score: t.eco_score == null ? null : Number(t.eco_score),
      }));
    },
  });
}
