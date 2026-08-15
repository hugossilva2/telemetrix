import { fireAutomationsForPlace } from "@/lib/automations/run.server";
import {
  accumIncrementKm,
  haversineKm as haversineKmPure,
  resolveTripDistanceKm,
} from "@/lib/flespi/distance";

/**
 * Núcleo de ingestão de mensagens do rastreador Flespi.
 * Usado pelo webhook (`/api/public/flespi-webhook`) e pelo coletor periódico
 * (`/api/public/flespi-poll`), para que o rastreamento funcione mesmo sem o
 * app aberto e mesmo que a Flespi não esteja com o webhook configurado.
 */

const MIN_DISTANCE_KM = 0.1;
const MIN_DURATION_S = 60;
const MOTION_SPEED_THRESHOLD = 3; // km/h — considera "em movimento"
const MOTION_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 min entre alertas de movimento
const PING_MIN_INTERVAL_MS = 20 * 1000; // grava ping no máximo a cada 20s
const GEOFENCE_EXIT_HYSTERESIS = 1.15; // só considera "saiu" a 15% além do raio
const ACCUM_MIN_STEP_KM = 0.01; // piso de 10 m: abaixo disso é jitter de GPS parado
const ACCUM_MAX_SPEED_KMH = 200; // teto: salto acima disso é reaquisição de sinal
const LEASE_MS = 90 * 1000; // lease de execução por device


export type FlespiMessage = Record<string, unknown> & {
  "device.id"?: number | string;
  ident?: number | string;
  cid?: number | string;
  "engine.ignition.status"?: boolean;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "vehicle.mileage"?: number;
  timestamp?: number;
};

function resolveDeviceId(msg: FlespiMessage): string | null {
  const candidates = [msg["device.id"], msg.ident, msg.cid];
  for (const c of candidates) {
    if (c !== undefined && c !== null && `${c}`.trim() !== "") return String(c);
  }
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  return haversineKmPure(lat1, lng1, lat2, lng2);
}

export interface IngestSummary {
  processed: number;
  skippedNoDevice: number;
  skippedUnknownVehicle: number;
  skippedOutOfOrder: number;
  skippedLocked: number;
  skippedDuplicate: number;
  received: number;
}

export async function ingestFlespiMessages(
  messages: FlespiMessage[],
): Promise<IngestSummary> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTrackerEventPush } = await import("@/lib/push/send.server");

  let processed = 0;
  let skippedNoDevice = 0;
  let skippedUnknownVehicle = 0;
  let skippedOutOfOrder = 0;
  let skippedLocked = 0;
  let skippedDuplicate = 0;

  // Caches por lote: um lote da Flespi é quase sempre do mesmo device/usuário,
  // então isso elimina praticamente todas as consultas repetidas.
  type CachedVehicle = {
    id: string;
    user_id: string;
    avg_consumption_kmpl: number | null;
    signal_lost_notified_at: string | null;
    alert_geofence: boolean | null;
  };
  type CachedPlace = {
    id: string;
    name: string | null;
    lat: number | null;
    lng: number | null;
    geofence_radius_m: number | null;
  };
  const vehicleCache = new Map<string, CachedVehicle | null>();
  const placesCache = new Map<string, CachedPlace[]>();

  const getVehicleForDevice = async (deviceId: string) => {
    if (vehicleCache.has(deviceId)) return vehicleCache.get(deviceId) ?? null;
    const { data } = await supabaseAdmin
      .from("vehicles")
      .select("id,user_id,avg_consumption_kmpl,signal_lost_notified_at,alert_geofence")
      .eq("flespi_device_id", deviceId)
      .maybeSingle();
    const v = (data as CachedVehicle | null) ?? null;
    vehicleCache.set(deviceId, v);
    return v;
  };

  const getPlacesForUser = async (userId: string) => {
    const cached = placesCache.get(userId);
    if (cached) return cached;
    const { data } = await supabaseAdmin
      .from("favorite_places")
      .select("id,name,lat,lng,geofence_radius_m")
      .eq("user_id", userId)
      .eq("geofence_enabled", true);
    const places = (data as CachedPlace[] | null) ?? [];
    placesCache.set(userId, places);
    return places;
  };

  /**
   * Lease de execução por device. O webhook e o coletor periódico leem a mesma
   * fonte; sem isso, duas execuções simultâneas duplicariam viagens e eventos.
   * Devolve `held` quando este processo é o dono do lease (precisa liberar).
   */
  const acquireLease = async (deviceId: string) => {
    const nowIso = new Date().toISOString();
    const untilIso = new Date(Date.now() + LEASE_MS).toISOString();
    const { data } = await supabaseAdmin
      .from("device_trip_state")
      .update({ ingest_lease_until: untilIso })
      .eq("device_id", deviceId)
      .or(`ingest_lease_until.is.null,ingest_lease_until.lt.${nowIso}`)
      .select("device_id");
    if (data && data.length > 0) return { ok: true, held: true };

    // Nenhuma linha afetada: ou o lease está ativo em outra execução, ou o
    // device ainda não tem estado (primeira mensagem) — nesse caso segue sem lease.
    const { data: existing } = await supabaseAdmin
      .from("device_trip_state")
      .select("device_id")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (existing) return { ok: false, held: false };
    return { ok: true, held: false };
  };

  const releaseLease = async (deviceId: string) => {
    await supabaseAdmin
      .from("device_trip_state")
      .update({ ingest_lease_until: null })
      .eq("device_id", deviceId);
  };

  // Agrupa por device preservando a ordem das mensagens.
  const groups = new Map<string, FlespiMessage[]>();
  for (const msg of messages) {
    const deviceId = resolveDeviceId(msg);
    if (!deviceId) {
      skippedNoDevice++;
      console.log("[flespi-webhook] skip: no device id", Object.keys(msg).slice(0, 10));
      continue;
    }
    const list = groups.get(deviceId);
    if (list) list.push(msg);
    else groups.set(deviceId, [msg]);
  }

  for (const [deviceId, deviceMessages] of groups) {
    // Resolve veículo/usuário pelo device_id (com cache por lote).
    const vehicle = await getVehicleForDevice(deviceId);
    if (!vehicle) {
      skippedUnknownVehicle += deviceMessages.length;
      console.log("[flespi-webhook] skip: no vehicle for device", deviceId);
      continue;
    }

    const lease = await acquireLease(deviceId);
    if (!lease.ok) {
      skippedLocked += deviceMessages.length;
      console.log("[flespi-webhook] skip: lease ativo em outra execução", deviceId);
      continue;
    }

    try {
      for (const msg of deviceMessages) {


    const ign = msg["engine.ignition.status"];
    const lat = msg["position.latitude"];
    const lng = msg["position.longitude"];
    const speed = msg["position.speed"];
    const mileage = msg["vehicle.mileage"];
    const tsMs =
      typeof msg.timestamp === "number"
        ? msg.timestamp * 1000
        : Date.now();
    const nowIso = new Date(tsMs).toISOString();

    const { data: state } = await supabaseAdmin
      .from("device_trip_state")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    // Guarda contra mensagens fora de ordem (Flespi pode enfileirar).
    if (state?.updated_at) {
      const stateMs = new Date(state.updated_at as string).getTime();
      if (tsMs < stateMs - 1000) {
        skippedOutOfOrder++;
        console.log(
          "[flespi-webhook] skip: out-of-order",
          deviceId,
          "msg",
          nowIso,
          "state",
          state.updated_at,
        );
        continue;
      }
    }

    console.log(
      "[flespi-webhook]",
      deviceId,
      "ign=",
      ign,
      "ts=",
      nowIso,
      "prevIgn=",
      state?.ignition_on ?? null,
      "hasOpenTrip=",
      state?.start_time != null,
    );

    const prevIgn = state?.ignition_on ?? null;

    // ---------- signal recuperado: limpa flag de "sinal perdido" ----------
    if (vehicle.signal_lost_notified_at) {
      await supabaseAdmin
        .from("vehicles")
        .update({ signal_lost_notified_at: null })
        .eq("id", vehicle.id);
      // Mantém o cache coerente: as próximas mensagens do lote não repetem.
      vehicle.signal_lost_notified_at = null;
    }


    // ---------- tracker_pings (amostragem) ----------
    // IMPORTANTE: comparar com `last_ping_at` (último ping gravado), nunca com
    // `last_message_at` — este avança a cada mensagem e, com o FMC003
    // reportando a cada ~6s, o intervalo de 20s nunca era alcançado.
    let pingWritten = false;
    if (
      typeof lat === "number" &&
      typeof lng === "number"
    ) {
      const lastPingMs = state?.last_ping_at
        ? new Date(state.last_ping_at as string).getTime()
        : 0;
      if (tsMs - lastPingMs >= PING_MIN_INTERVAL_MS) {
        // Reentrega do mesmo lote é no-op (unique vehicle_id + recorded_at).
        const { data: pingRows } = await supabaseAdmin
          .from("tracker_pings")
          .upsert(
            {
              user_id: vehicle.user_id,
              vehicle_id: vehicle.id,
              lat,
              lng,
              speed_kmh: typeof speed === "number" ? speed : null,
              ignition: typeof ign === "boolean" ? ign : null,
              recorded_at: nowIso,
            },
            { onConflict: "vehicle_id,recorded_at", ignoreDuplicates: true },
          )
          .select("id");
        if (!pingRows || pingRows.length === 0) skippedDuplicate++;
        pingWritten = true;
      }
    }

    // ---------- tracker_events: ignição ----------
    if (ign === true && prevIgn === false) {
      await supabaseAdmin.from("tracker_events").insert({
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        type: "ignition_on",
        lat: lat ?? null,
        lng: lng ?? null,
        occurred_at: nowIso,
      });
      await sendTrackerEventPush(vehicle.user_id as string, "ignition_on", { vehicleId: vehicle.id as string });
    } else if (ign === false && prevIgn === true) {
      await supabaseAdmin.from("tracker_events").insert({
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        type: "ignition_off",
        lat: lat ?? null,
        lng: lng ?? null,
        occurred_at: nowIso,
      });
      await sendTrackerEventPush(vehicle.user_id as string, "ignition_off", { vehicleId: vehicle.id as string });
    }

    // ---------- tracker_events: movimento com motor desligado ----------
    if (
      ign === false &&
      typeof speed === "number" &&
      speed >= MOTION_SPEED_THRESHOLD
    ) {
      const lastMotion = (state?.geofence_state as any)?.last_motion_off_at as
        | string
        | undefined;
      const lastMotionMs = lastMotion ? new Date(lastMotion).getTime() : 0;
      if (tsMs - lastMotionMs >= MOTION_ALERT_COOLDOWN_MS) {
        await supabaseAdmin.from("tracker_events").insert({
          user_id: vehicle.user_id,
          vehicle_id: vehicle.id,
          type: "motion_off_ignition",
          lat: lat ?? null,
          lng: lng ?? null,
          metadata: { speed_kmh: speed },
          occurred_at: nowIso,
        });
        await sendTrackerEventPush(vehicle.user_id as string, "motion_off_ignition", { vehicleId: vehicle.id as string });
        // persistir cooldown no geofence_state
        const nextGeo = {
          ...((state?.geofence_state as any) ?? {}),
          last_motion_off_at: nowIso,
        };
        await supabaseAdmin
          .from("device_trip_state")
          .upsert({
            device_id: deviceId,
            user_id: vehicle.user_id,
            vehicle_id: vehicle.id,
            geofence_state: nextGeo,
            updated_at: nowIso,
          });
      }
    }

    // ---------- tracker_events: geofence enter/exit + automações ----------
    if (
      typeof lat === "number" &&
      typeof lng === "number"
    ) {
      if (vehicle.alert_geofence !== false) {
        const places = await getPlacesForUser(vehicle.user_id as string);
        if (places && places.length > 0) {

          const geoState = (state?.geofence_state as any) ?? {};
          const placesState: Record<string, boolean> =
            geoState.places ?? {};
          const nextPlaces: Record<string, boolean> = { ...placesState };
          let changed = false;
          for (const p of places) {
            if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
            const radiusKm = ((p.geofence_radius_m as number) || 500) / 1000;
            const distKm = haversineKm(p.lat, p.lng, lat, lng);
            const wasInside = placesState[p.id as string];
            // Histerese: entra ao cruzar o raio, só sai depois de 15% além.
            let inside: boolean;
            if (wasInside === true) {
              inside = distKm <= radiusKm * GEOFENCE_EXIT_HYSTERESIS;
            } else {
              inside = distKm <= radiusKm;
            }

            if (wasInside === true && inside === false) {
              await supabaseAdmin.from("tracker_events").insert({
                user_id: vehicle.user_id,
                vehicle_id: vehicle.id,
                type: "geofence_exit",
                lat,
                lng,
                place_id: p.id,
                metadata: { place_name: p.name, radius_m: p.geofence_radius_m ?? 500 },
                occurred_at: nowIso,
              });
              await sendTrackerEventPush(vehicle.user_id as string, "geofence_exit", { placeName: (p.name as string) ?? null, vehicleId: vehicle.id as string });
              await fireAutomationsForPlace(supabaseAdmin as never, {
                userId: vehicle.user_id as string,
                placeId: p.id as string,
                placeName: (p.name as string) ?? "",
                trigger: "exit",
                lat,
                lng,
                nowMs: tsMs,
              });
            } else if (wasInside === false && inside === true) {
              await supabaseAdmin.from("tracker_events").insert({
                user_id: vehicle.user_id,
                vehicle_id: vehicle.id,
                type: "geofence_enter",
                lat,
                lng,
                place_id: p.id,
                metadata: { place_name: p.name, radius_m: p.geofence_radius_m ?? 500 },
                occurred_at: nowIso,
              });
              await sendTrackerEventPush(vehicle.user_id as string, "geofence_enter", { placeName: (p.name as string) ?? null, vehicleId: vehicle.id as string });
              await fireAutomationsForPlace(supabaseAdmin as never, {
                userId: vehicle.user_id as string,
                placeId: p.id as string,
                placeName: (p.name as string) ?? "",
                trigger: "enter",
                lat,
                lng,
                nowMs: tsMs,
              });
            }

            if (nextPlaces[p.id as string] !== inside) {
              nextPlaces[p.id as string] = inside;
              changed = true;
            }
          }
          if (changed) {
            const nextGeo = { ...geoState, places: nextPlaces };
            await supabaseAdmin
              .from("device_trip_state")
              .upsert({
                device_id: deviceId,
                user_id: vehicle.user_id,
                vehicle_id: vehicle.id,
                geofence_state: nextGeo,
                updated_at: nowIso,
              });
          }
        }
      }
    }






    // Abre viagem: OFF→ON ou primeira observação já ligada sem estado.
    const shouldOpen =
      ign === true &&
      (prevIgn === false ||
        prevIgn === null ||
        state?.start_time == null);

    // Fecha viagem: ON→OFF (ou primeira observação desligada com viagem aberta).
    const shouldClose =
      ign === false && state?.start_time != null;

    if (shouldOpen) {
      await supabaseAdmin.from("device_trip_state").upsert({
        device_id: deviceId,
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        ignition_on: true,
        start_time: nowIso,
        start_lat: lat ?? null,
        start_lng: lng ?? null,
        mileage_at_start: mileage ?? null,
        last_lat: lat ?? null,
        last_lng: lng ?? null,
        last_mileage: mileage ?? null,
        max_speed_kmh: speed ?? 0,
        accum_distance_km: 0,
        updated_at: nowIso,
        last_message_at: nowIso,
        ...(pingWritten ? { last_ping_at: nowIso } : {}),
      });
      processed++;
      continue;
    }

    if (shouldClose && state) {
      const endLat = lat ?? state.last_lat;
      const endLng = lng ?? state.last_lng;
      const endMileage = mileage ?? state.last_mileage;

      // Último trecho antes de desligar também entra no acumulado.
      const lastMsgMs = state.last_message_at
        ? new Date(state.last_message_at as string).getTime()
        : null;
      const finalIncrement = accumIncrementKm({
        prevLat: state.last_lat,
        prevLng: state.last_lng,
        lat,
        lng,
        dtSeconds: lastMsgMs ? (tsMs - lastMsgMs) / 1000 : null,
      });
      const accumKm = Number(state.accum_distance_km ?? 0) + finalIncrement;

      // Odômetro é mais preciso; acumulado ping a ping cobre viagens circulares;
      // linha reta início→fim é só o último recurso.
      const distanceKm = resolveTripDistanceKm({
        mileageStart: state.mileage_at_start as number | null,
        mileageEnd: endMileage as number | null,
        accumKm,
        startLat: state.start_lat,
        startLng: state.start_lng,
        endLat,
        endLng,
      });

      const durationS = Math.max(
        0,
        Math.round(
          (new Date(nowIso).getTime() -
            new Date(state.start_time as string).getTime()) /
            1000,
        ),
      );

      if (distanceKm < MIN_DISTANCE_KM && durationS < MIN_DURATION_S) {
        await supabaseAdmin
          .from("device_trip_state")
          .delete()
          .eq("device_id", deviceId);
        continue;
      }

      const durationH = durationS / 3600;
      const avgSpeed = durationH > 0 ? distanceKm / durationH : 0;

      const { data: lastFuel } = await supabaseAdmin
        .from("fuel_logs")
        .select("price_per_liter")
        .eq("user_id", vehicle.user_id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const kmpl = Number(vehicle.avg_consumption_kmpl) || 10;
      const price = Number(lastFuel?.price_per_liter) || 5.89;
      const fuelLiters = kmpl > 0 ? distanceKm / kmpl : null;
      const estimatedCost =
        fuelLiters !== null && price > 0 ? fuelLiters * price : null;

      const maxSpeed = Math.max(
        Number(state.max_speed_kmh) || 0,
        typeof speed === "number" ? speed : 0,
      );

      // Reentrega do mesmo fechamento é no-op (unique vehicle_id + start_time).
      const { data: tripRows } = await supabaseAdmin
        .from("trips")
        .upsert(
          {
            user_id: vehicle.user_id,
            vehicle_id: vehicle.id,
            start_time: state.start_time as string,
            end_time: nowIso,
            start_lat: state.start_lat,
            start_lng: state.start_lng,
            end_lat: endLat,
            end_lng: endLng,
            distance_km: distanceKm,
            avg_speed_kmh: avgSpeed,
            max_speed_kmh: maxSpeed,
            mileage_at_start: state.mileage_at_start,
            mileage_at_end: endMileage,
            fuel_liters: fuelLiters,
            estimated_cost: estimatedCost,
          },
          { onConflict: "vehicle_id,start_time", ignoreDuplicates: true },
        )
        .select("id");
      if (!tripRows || tripRows.length === 0) skippedDuplicate++;

      await supabaseAdmin
        .from("device_trip_state")
        .delete()
        .eq("device_id", deviceId);
      processed++;
      continue;
    }

    // Atualização durante viagem em andamento.
    if (ign === true && state?.start_time != null) {
      const nextMax = Math.max(
        Number(state.max_speed_kmh) || 0,
        typeof speed === "number" ? speed : 0,
      );
      const lastMsgMs = state.last_message_at
        ? new Date(state.last_message_at as string).getTime()
        : null;
      const increment = accumIncrementKm({
        prevLat: state.last_lat,
        prevLng: state.last_lng,
        lat,
        lng,
        dtSeconds: lastMsgMs ? (tsMs - lastMsgMs) / 1000 : null,
      });
      await supabaseAdmin
        .from("device_trip_state")
        .update({
          ignition_on: true,
          last_lat: lat ?? state.last_lat,
          last_lng: lng ?? state.last_lng,
          last_mileage: mileage ?? state.last_mileage,
          max_speed_kmh: nextMax,
          start_lat: state.start_lat ?? lat ?? null,
          start_lng: state.start_lng ?? lng ?? null,
          mileage_at_start:
            state.mileage_at_start ?? mileage ?? null,
          accum_distance_km:
            Number(state.accum_distance_km ?? 0) + increment,
          updated_at: nowIso,
          last_message_at: nowIso,
          ...(pingWritten ? { last_ping_at: nowIso } : {}),
        })
        .eq("device_id", deviceId);
      processed++;
    } else if (ign === false && state?.start_time == null) {
      // Persiste "desligado" para a próxima transição OFF→ON abrir viagem.
      await supabaseAdmin.from("device_trip_state").upsert({
        device_id: deviceId,
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        ignition_on: false,
        updated_at: nowIso,
        max_speed_kmh: 0,
        last_message_at: nowIso,
        ...(pingWritten ? { last_ping_at: nowIso } : {}),
      });
    }
      }
    } finally {
      // Libera o lease mesmo em caso de erro (a linha pode ter sido apagada no
      // fechamento da viagem — nesse caso o update é no-op).
      if (lease.held) await releaseLease(deviceId);
    }
  }

  return {
    processed,
    skippedNoDevice,
    skippedUnknownVehicle,
    skippedOutOfOrder,
    skippedLocked,
    skippedDuplicate,
    received: messages.length,
  };
}

