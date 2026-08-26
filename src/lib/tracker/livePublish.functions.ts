import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  ignitionOn: z.boolean().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  speedKmh: z.number().nullable().optional(),
  mileageKm: z.number().nullable().optional(),
  maxSpeedKmh: z.number().nullable().optional(),
  startTime: z.string().nullable().optional(),
  /** Horário da mensagem de telemetria (não o horário do envio). */
  recordedAt: z.string().datetime().nullable().optional(),
});

/**
 * Publica a telemetria ao vivo do app do dono em `device_trip_state` e
 * `tracker_pings`, para que contas observadoras (somente leitura) consigam
 * acompanhar a viagem em tempo real mesmo sem o webhook do Flespi.
 */
export const publishLiveState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: vehicle, error: vErr } = await context.supabase
      .from("vehicles")
      .select("id,flespi_device_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!vehicle) return { ok: false as const, reason: "no-vehicle" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    // Horário real do dado; evita ping falso com o horário do envio.
    const sampleIso = data.recordedAt ?? nowIso;
    const deviceId = vehicle.flespi_device_id ?? `app-${vehicle.id}`;

    const hasFix = typeof data.lat === "number" && typeof data.lng === "number";

    const { error: stateErr } = await supabaseAdmin.from("device_trip_state").upsert(
      {
        device_id: deviceId,
        user_id: context.userId,
        vehicle_id: vehicle.id,
        ignition_on: data.ignitionOn ?? null,
        start_time: data.startTime ?? null,
        last_lat: hasFix ? data.lat : null,
        last_lng: hasFix ? data.lng : null,
        last_mileage: data.mileageKm ?? null,
        max_speed_kmh: data.maxSpeedKmh ?? 0,
        last_message_at: sampleIso,
        updated_at: nowIso,
      },
      { onConflict: "device_id" },
    );
    if (stateErr) throw stateErr;

    if (hasFix) {
      const { error: pingErr } = await supabaseAdmin.from("tracker_pings").upsert(
        {
          user_id: context.userId,
          vehicle_id: vehicle.id,
          lat: data.lat as number,
          lng: data.lng as number,
          speed_kmh: data.speedKmh ?? null,
          ignition: data.ignitionOn ?? null,
          recorded_at: sampleIso,
        },
        { onConflict: "vehicle_id,recorded_at", ignoreDuplicates: true },
      );
      if (pingErr) throw pingErr;
    }

    return { ok: true as const, vehicleId: vehicle.id, ping: hasFix };
  });
