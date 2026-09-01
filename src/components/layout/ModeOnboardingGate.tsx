import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAccountMode } from "@/lib/account/profile";
import { useIsObserver } from "@/lib/shares/observer";

/**
 * Primeiro acesso: leva a conta à escolha do perfil de uso antes de liberar o app.
 * Observadores (convidados para acompanhar um carro) não passam por isso.
 */
export function ModeOnboardingGate() {
  const { needsOnboarding, loading } = useAccountMode();
  const { isObserver } = useIsObserver();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || isObserver) return;
    if (needsOnboarding && pathname !== "/perfil-de-uso") {
      navigate({ to: "/perfil-de-uso", replace: true });
    }
  }, [loading, isObserver, needsOnboarding, pathname, navigate]);

  return null;
}
