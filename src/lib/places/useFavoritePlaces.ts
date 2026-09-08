// Consulta única de lugares favoritos, com colunas explícitas e um só staleTime.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FAVORITE_PLACES_SELECT =
  "id,name,address,icon,lat,lng,geofence_enabled,geofence_radius_m,created_at";

export type FavoritePlace = {
  id: string;
  name: string;
  address: string;
  icon: string;
  lat: number;
  lng: number;
  geofence_enabled: boolean;
  geofence_radius_m: number;
  created_at: string;
};

export const FAVORITE_PLACES_KEY = ["favorite_places"] as const;

export async function fetchFavoritePlaces(): Promise<FavoritePlace[]> {
  const { data, error } = await supabase
    .from("favorite_places")
    .select(FAVORITE_PLACES_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FavoritePlace[];
}

export function useFavoritePlaces() {
  return useQuery<FavoritePlace[]>({
    queryKey: FAVORITE_PLACES_KEY,
    queryFn: fetchFavoritePlaces,
    staleTime: 60_000,
  });
}
