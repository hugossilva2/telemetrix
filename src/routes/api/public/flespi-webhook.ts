import { createFileRoute } from "@tanstack/react-router";
import { fireAutomationsForPlace } from "@/lib/automations/run.server";


/**
 * Webhook do Flespi. Recebe telemetria via HTTP e detecta transições da
 * ignição no servidor, para que viagens sejam gravadas mesmo com o app
 * fechado.
 *
 * Configuração no Flespi (Plugins → Webhook):
 *   URL: https://drive-wise-69.lovable.app/api/public/flespi-webhook?secret=<FLESPI_WEBHOOK_SECRET>
 *   Method: POST
 *   Payload: JSON com messages do device
 */

const MIN_DISTANCE_KM = 0.1;
const MIN_DURATION_S = 60;
const MOTION_SPEED_THRESHOLD = 3; // km/h — considera "em movimento"
const MOTION_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 min entre alertas de movimento
const PING_MIN_INTERVAL_MS = 20 * 1000; // grava ping no máximo a cada 20s
const GEOFENCE_EXIT_HYSTERESIS = 1.15; // só considera "saiu" a 15% além do raio


type FlespiMessage = Record<string, unknown> & {
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
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const Route = createFileRoute("/api/public/flespi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.FLESPI_WEBHOOK_SECRET;
        if (!expected) {
          return new Response("Server not configured", { status: 500 });
        }
        const url = new URL(request.url);
        const provided =
          url.searchParams.get("secret") ??
          request.headers.get("x-webhook-secret") ??
          "";
        if (provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Flespi pode enviar um único objeto ou um array de mensagens.
        const messages: FlespiMessage[] = Array.isArray(body)
          ? (body as FlespiMessage[])
          : ([body] as FlespiMessage[]);

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendTrackerEventPush } = await import("@/lib/push/send.server");

        let processed = 0;
        let skippedNoDevice = 0;
        let skippedUnknownVehicle = 0;
        let skippedOutOfOrder = 0;

        for (const msg of messages) {
          const deviceId = resolveDeviceId(msg);
          if (!deviceId) {
            skippedNoDevice++;
            console.log("[flespi-webhook] skip: no device id", Object.keys(msg).slice(0, 10));
            continue;
          }

          // Resolve veículo/usuário pelo device_id.
          const { data: vehicle } = await supabaseAdmin
            .from("vehicles")
            .select("id,user_id,avg_consumption_kmpl")
            .eq("flespi_device_id", deviceId)
            .maybeSingle();
          if (!vehicle) {
            skippedUnknownVehicle++;
            console.log("[flespi-webhook] skip: no vehicle for device", deviceId);
            continue;
          }

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
          const { data: vehicleFlags } = await supabaseAdmin
            .from("vehicles")
            .select("signal_lost_notified_at")
            .eq("id", vehicle.id)
            .maybeSingle();
          if (vehicleFlags?.signal_lost_notified_at) {
            await supabaseAdmin
              .from("vehicles")
              .update({ signal_lost_notified_at: null })
              .eq("id", vehicle.id);
          }

          // ---------- tracker_pings (amostragem) ----------
          if (
            typeof lat === "number" &&
            typeof lng === "number"
          ) {
            const lastPingMs = state?.last_message_at
              ? new Date(state.last_message_at as string).getTime()
              : 0;
            if (tsMs - lastPingMs >= PING_MIN_INTERVAL_MS) {
              await supabaseAdmin.from("tracker_pings").insert({
                user_id: vehicle.user_id,
                vehicle_id: vehicle.id,
                lat,
                lng,
                speed_kmh: typeof speed === "number" ? speed : null,
                ignition: typeof ign === "boolean" ? ign : null,
                recorded_at: nowIso,
              });
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
            await sendTrackerEventPush(vehicle.user_id as string, "ignition_on");
          } else if (ign === false && prevIgn === true) {
            await supabaseAdmin.from("tracker_events").insert({
              user_id: vehicle.user_id,
              vehicle_id: vehicle.id,
              type: "ignition_off",
              lat: lat ?? null,
              lng: lng ?? null,
              occurred_at: nowIso,
            });
            await sendTrackerEventPush(vehicle.user_id as string, "ignition_off");
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
              await sendTrackerEventPush(vehicle.user_id as string, "motion_off_ignition");
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
            const { data: vehicleAlerts } = await supabaseAdmin
              .from("vehicles")
              .select("alert_geofence")
              .eq("id", vehicle.id)
              .maybeSingle();
            if (vehicleAlerts?.alert_geofence !== false) {
              const { data: places } = await supabaseAdmin
                .from("favorite_places")
                .select("id,name,lat,lng,geofence_radius_m")
                .eq("user_id", vehicle.user_id)
                .eq("geofence_enabled", true);
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
                    await sendTrackerEventPush(vehicle.user_id as string, "geofence_exit", { placeName: (p.name as string) ?? null });
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
                    await sendTrackerEventPush(vehicle.user_id as string, "geofence_enter", { placeName: (p.name as string) ?? null });
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
              updated_at: nowIso,
              last_message_at: nowIso,
            });
            processed++;
            continue;
          }

          if (shouldClose && state) {
            const endLat = lat ?? state.last_lat;
            const endLng = lng ?? state.last_lng;
            const endMileage = mileage ?? state.last_mileage;

            let distanceKm = 0;
            if (
              typeof endMileage === "number" &&
              typeof state.mileage_at_start === "number" &&
              endMileage > state.mileage_at_start
            ) {
              distanceKm = endMileage - state.mileage_at_start;
            } else if (
              typeof state.start_lat === "number" &&
              typeof state.start_lng === "number" &&
              typeof endLat === "number" &&
              typeof endLng === "number"
            ) {
              distanceKm = haversineKm(
                state.start_lat,
                state.start_lng,
                endLat,
                endLng,
              );
            }

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

            await supabaseAdmin.from("trips").insert({
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
            });

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
                updated_at: nowIso,
                last_message_at: nowIso,
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
            });
          }
        }

        return Response.json({
          ok: true,
          processed,
          skippedNoDevice,
          skippedUnknownVehicle,
          skippedOutOfOrder,
          received: messages.length,
        });
      },
    },
  },
});
