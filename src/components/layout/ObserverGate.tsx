import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useIsObserver } from "@/lib/shares/observer";

/**
 * Mantém contas observadoras restritas à rota de rastreamento (/acompanhar).
 */
export function ObserverGate() {
  const { isObserver } = useIsObserver();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (isObserver && pathname !== "/acompanhar") {
      navigate({ to: "/acompanhar", replace: true });
    }
  }, [isObserver, pathname, navigate]);

  return null;
}
