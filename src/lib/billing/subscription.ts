import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { limitsFor, parsePlanId, type PlanId, type PlanLimits } from "./plans";

export interface SubscriptionState {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  limits: PlanLimits;
  loading: boolean;
}

const QUERY_KEY = ["subscription", "current"] as const;

async function fetchSubscription(): Promise<{
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
}> {
  const fallback = {
    plan: "free" as PlanId,
    status: "active",
    currentPeriodEnd: null,
    trialEndsAt: null,
  };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return fallback;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("plan,status,current_period_end,trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return fallback;

  const active = data.status === "active" || data.status === "trialing";
  const periodOk =
    !data.current_period_end ||
    new Date(data.current_period_end).getTime() > Date.now() ||
    (data.trial_ends_at != null && new Date(data.trial_ends_at).getTime() > Date.now());

  return {
    plan: active && periodOk ? parsePlanId(data.plan) : "free",
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    trialEndsAt: data.trial_ends_at,
  };
}

/** Plano ativo do usuário e os limites correspondentes. */
export function useSubscription(): SubscriptionState {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });

  const plan = data?.plan ?? "free";
  return {
    plan,
    status: data?.status ?? "active",
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    trialEndsAt: data?.trialEndsAt ?? null,
    limits: limitsFor(plan),
    loading: isLoading,
  };
}

/** Atalho: o plano atual libera determinado recurso? */
export function useFeature(feature: keyof PlanLimits): boolean {
  const { limits } = useSubscription();
  const value = limits[feature];
  return typeof value === "boolean" ? value : Number(value) > 0;
}
