import { createFileRoute } from "@tanstack/react-router";

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

type FlespiMessage = Record<string, unknown> & {
  "device.id"?: number | string;
  "engine.ignition.status"?: boolean;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "vehicle.mileage"?: number;
  timestamp?: number;
};

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

        let processed = 0;
        for (const msg of messages) {
          const deviceIdRaw = msg["device.id"];
          const deviceId =
            deviceIdRaw !== undefined && deviceIdRaw !== null
              ? String(deviceIdRaw)
              : null;
          if (!deviceId) continue;

          // Resolve veículo/usuário pelo device_id.
          const { data: vehicle } = await supabaseAdmin
            .from("vehicles")
            .select("id,user_id,avg_consumption_kmpl")
            .eq("flespi_device_id", deviceId)
            .maybeSingle();
          if (!vehicle) continue;

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

          const prevIgn = state?.ignition_on ?? null;

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
            const price = Number(lastFuel?.price_per_liter) || 0;
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
            });
          }
        }

        return Response.json({ ok: true, processed });
      },
    },
  },
});
