import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { tripStore, type OpenTrip } from "@/lib/trips/store";
import { haversineKm } from "@/lib/trips/geo";

const MIN_DISTANCE_KM = 0.1;
const MIN_DURATION_S = 60;

/**
 * Detecta transições da ignição para abrir/fechar viagens automaticamente.
 * OFF→ON abre uma viagem; ON→OFF fecha e grava em `public.trips`.
 */
export function useTripRecorder() {
  const { telemetry } = useFlespiMqtt();
  const prevIgnition = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const ign = telemetry.ignitionOn;
    if (ign === undefined) return;

    const prev = prevIgnition.current;
    prevIgnition.current = ign;

    // Abrir viagem (OFF → ON)
    if (prev === false && ign === true) {
      const open: OpenTrip = {
        startTime: new Date().toISOString(),
        startLat: telemetry.latitude ?? null,
        startLng: telemetry.longitude ?? null,
        mileageAtStart: telemetry.mileageKm ?? null,
        lastLat: telemetry.latitude ?? null,
        lastLng: telemetry.longitude ?? null,
        lastMileage: telemetry.mileageKm ?? null,
        maxSpeedKmh: telemetry.speedKmh ?? 0,
      };
      tripStore.set(open);
      toast.success("Viagem iniciada", {
        description: "Registro automático ativado.",
      });
      return;
    }

    // Fechar viagem (ON → OFF)
    if (prev === true && ign === false) {
      const open = tripStore.get();
      if (!open) return;
      void finalizeTrip(open, telemetry).catch((e) => {
        console.warn("[trip] finalize error", e);
        toast.error("Falha ao salvar viagem", {
          description: (e as Error).message,
        });
      });
      return;
    }
  }, [telemetry]);

  // Enquanto motor ligado, atualiza últimos dados da viagem aberta.
  useEffect(() => {
    const open = tripStore.get();
    if (!open) return;
    if (telemetry.ignitionOn !== true) return;
    const next: OpenTrip = {
      ...open,
      lastLat: telemetry.latitude ?? open.lastLat,
      lastLng: telemetry.longitude ?? open.lastLng,
      lastMileage: telemetry.mileageKm ?? open.lastMileage,
      maxSpeedKmh: Math.max(open.maxSpeedKmh, telemetry.speedKmh ?? 0),
      // Se a posição/odômetro do início veio nulo, tenta preencher agora.
      startLat: open.startLat ?? telemetry.latitude ?? null,
      startLng: open.startLng ?? telemetry.longitude ?? null,
      mileageAtStart: open.mileageAtStart ?? telemetry.mileageKm ?? null,
    };
    tripStore.set(next);
  }, [
    telemetry.latitude,
    telemetry.longitude,
    telemetry.mileageKm,
    telemetry.speedKmh,
    telemetry.ignitionOn,
  ]);
}

async function finalizeTrip(
  open: OpenTrip,
  telemetry: ReturnType<typeof useFlespiMqtt>["telemetry"],
) {
  const endTime = new Date();
  const endLat = telemetry.latitude ?? open.lastLat;
  const endLng = telemetry.longitude ?? open.lastLng;
  const endMileage = telemetry.mileageKm ?? open.lastMileage;

  // Distância: preferir delta de odômetro; senão, Haversine.
  let distanceKm = 0;
  if (
    typeof endMileage === "number" &&
    typeof open.mileageAtStart === "number" &&
    endMileage > open.mileageAtStart
  ) {
    distanceKm = endMileage - open.mileageAtStart;
  } else if (
    typeof open.startLat === "number" &&
    typeof open.startLng === "number" &&
    typeof endLat === "number" &&
    typeof endLng === "number"
  ) {
    distanceKm = haversineKm(open.startLat, open.startLng, endLat, endLng);
  }

  const durationS = Math.max(
    0,
    Math.round((endTime.getTime() - new Date(open.startTime).getTime()) / 1000),
  );

  // Descarta ruído (motor ligado brevemente sem deslocamento).
  if (distanceKm < MIN_DISTANCE_KM && durationS < MIN_DURATION_S) {
    tripStore.set(null);
    return;
  }

  const durationH = durationS / 3600;
  const avgSpeed = durationH > 0 ? distanceKm / durationH : 0;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    tripStore.set(null);
    return;
  }

  // Consumo e último preço para estimar combustível/custo.
  const [{ data: vehicle }, { data: lastFuel }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,avg_consumption_kmpl")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fuel_logs")
      .select("price_per_liter")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const kmpl = Number(vehicle?.avg_consumption_kmpl) || 10;
  const price = Number(lastFuel?.price_per_liter) || 0;
  const fuelLiters = kmpl > 0 ? distanceKm / kmpl : null;
  const estimatedCost =
    fuelLiters !== null && price > 0 ? fuelLiters * price : null;

  const { error } = await supabase.from("trips").insert({
    user_id: userId,
    vehicle_id: vehicle?.id ?? null,
    start_time: open.startTime,
    end_time: endTime.toISOString(),
    start_lat: open.startLat,
    start_lng: open.startLng,
    end_lat: endLat,
    end_lng: endLng,
    distance_km: distanceKm,
    avg_speed_kmh: avgSpeed,
    max_speed_kmh: open.maxSpeedKmh,
    mileage_at_start: open.mileageAtStart,
    mileage_at_end: endMileage,
    fuel_liters: fuelLiters,
    estimated_cost: estimatedCost,
  });

  if (error) throw error;

  tripStore.set(null);
  toast.success("Viagem finalizada", {
    description: `${distanceKm.toFixed(1)} km em ${formatDuration(durationS)}`,
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}
