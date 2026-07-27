import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { distanceToPathKm, tripPlanStore, useTripPlan } from "@/lib/trips/plan";

const OFF_ROUTE_KM = 0.35;
const BACK_ON_ROUTE_KM = 0.2;
const COOLDOWN_MS = 60_000;

/**
 * Monitora, em tempo real, se o veículo saiu da rota planejada.
 * Avisa uma vez ao desviar e outra ao retornar (com cooldown).
 */
export function useRouteDeviation() {
  const plan = useTripPlan();
  const { telemetry } = useFlespiMqtt();
  const offRoute = useRef(false);
  const lastAlert = useRef(0);

  const lat = telemetry.latitude;
  const lng = telemetry.longitude;

  useEffect(() => {
    if (!plan?.monitoring || !plan.path.length) return;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const dist = distanceToPathKm(lat, lng, plan.path);
    if (dist === null) return;

    const now = Date.now();
    if (!offRoute.current && dist > OFF_ROUTE_KM) {
      offRoute.current = true;
      if (now - lastAlert.current > COOLDOWN_MS) {
        lastAlert.current = now;
        toast.warning("Fora da rota planejada", {
          description: `Você está a ${Math.round(dist * 1000)} m do trajeto previsto.`,
        });
      }
    } else if (offRoute.current && dist < BACK_ON_ROUTE_KM) {
      offRoute.current = false;
      if (now - lastAlert.current > COOLDOWN_MS) {
        lastAlert.current = now;
        toast.success("De volta à rota planejada");
      }
    }
  }, [plan, lat, lng]);

  // Chegou ao destino: encerra o monitoramento
  useEffect(() => {
    if (!plan?.monitoring) return;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const last = plan.path[plan.path.length - 1];
    if (!last) return;
    const dLat = Math.abs(last[0] - lat);
    const dLng = Math.abs(last[1] - lng);
    if (dLat < 0.0015 && dLng < 0.0015) {
      tripPlanStore.set({ ...plan, monitoring: false });
      toast.success("Você chegou ao destino planejado");
    }
  }, [plan, lat, lng]);
}
