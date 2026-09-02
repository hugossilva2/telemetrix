import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aluno = conta vinculada a um cadastro de aluno, sem carro próprio e sem
 * papel de dono/instrutor em nenhuma escola.
 */
export function useIsStudent() {
  const { data, isLoading } = useQuery({
    queryKey: ["is-student"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;
      const [{ count: enrolled }, { count: owned }, { count: staff }] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .in("role", ["owner", "instructor"]),
      ]);
      return (enrolled ?? 0) > 0 && (owned ?? 0) === 0 && (staff ?? 0) === 0;
    },
  });
  return { isStudent: data === true, isLoading };
}
