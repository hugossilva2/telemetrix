import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_MODE_INFO, parseAccountMode, type AccountMode, type AccountModeInfo } from "./mode";

export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

export interface ProfileRecord {
  user_id: string;
  mode: AccountMode;
  display_name: string | null;
  onboarded_at: string | null;
}

async function fetchProfile(): Promise<ProfileRecord | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,mode,display_name,onboarded_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Conta anterior ao trigger: cria o perfil na hora, sem onboarding.
    const { data: created, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: userId, onboarded_at: new Date().toISOString() })
      .select("user_id,mode,display_name,onboarded_at")
      .single();
    if (insErr) throw insErr;
    return { ...created, mode: parseAccountMode(created.mode) };
  }
  return { ...data, mode: parseAccountMode(data.mode) };
}

interface AccountModeValue {
  mode: AccountMode;
  info: AccountModeInfo;
  profile: ProfileRecord | null;
  /** Ainda não escolheu o modo no primeiro acesso. */
  needsOnboarding: boolean;
  loading: boolean;
}

const AccountModeContext = createContext<AccountModeValue>({
  mode: "motorista",
  info: ACCOUNT_MODE_INFO.motorista,
  profile: null,
  needsOnboarding: false,
  loading: true,
});

export function useAccountMode(): AccountModeValue {
  return useContext(AccountModeContext);
}

export function AccountModeProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  });

  const value = useMemo<AccountModeValue>(() => {
    const mode = data?.mode ?? "motorista";
    return {
      mode,
      info: ACCOUNT_MODE_INFO[mode],
      profile: data ?? null,
      needsOnboarding: !!data && data.onboarded_at === null,
      loading: isLoading,
    };
  }, [data, isLoading]);

  return <AccountModeContext.Provider value={value}>{children}</AccountModeContext.Provider>;
}

/** Salva o modo escolhido (e marca o onboarding como concluído). */
export function useSetAccountMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mode: AccountMode; displayName?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");
      const payload: { mode: AccountMode; onboarded_at: string; display_name?: string | null } = {
        mode: input.mode,
        onboarded_at: new Date().toISOString(),
      };
      if (input.displayName !== undefined) payload.display_name = input.displayName.trim() || null;
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
  });
}
