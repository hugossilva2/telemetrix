import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Observador = conta convidada que não possui veículos próprios, apenas
 * compartilhamentos ativos. Só pode acessar a rota /acompanhar.
 */
export function useIsObserver() {
  const { data, isLoading } = useQuery({
    queryKey: ["is-observer"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;

      const [{ count: ownedCount }, { count: sharedCount }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase
          .from("vehicle_shares")
          .select("id", { count: "exact", head: true })
          .is("revoked_at", null),
      ]);

      return (ownedCount ?? 0) === 0 && (sharedCount ?? 0) > 0;
    },
  });

  return { isObserver: data === true, isLoading };
}
