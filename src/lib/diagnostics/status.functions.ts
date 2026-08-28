import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  vehicleId: z.string().uuid().nullable().optional(),
});

export interface DiagnosticsSnapshot {
  serverNow: string;
  vehicle: { id: string; name: string; deviceId: string | null; trackerMode: boolean } | null;
  state: {
    deviceId: string;
    ignitionOn: boolean | null;
    lastMessageAt: string | null;
    lastPingAt: string | null;
    updatedAt: string | null;
  } | null;
  signalLostNotifiedAt: string | null;
  lastSignalLost: {
    occurredAt: string;
    metadata: {
      last_message_at: string | null;
      threshold_min: number | null;
      parked: boolean | null;
    };
  } | null;
  pingsLastHour: number;
  lastPing: { recordedAt: string; lat: number; lng: number } | null;
  lastTripEndedAt: string | null;
}

/**
 * Fotografia do lado servidor da ingestão: o que o banco recebeu do rastreador
 * (última mensagem, último ping gravado) e o último alerta de sinal perdido.
 * Serve para separar "o app está desconectado" de "o rastreador parou de enviar".
 */
export const getDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<DiagnosticsSnapshot> => {
    const { supabase, userId } = context;
    const serverNow = new Date().toISOString();

    let query = supabase
      .from("vehicles")
      .select("id,name,flespi_device_id,tracker_mode,signal_lost_notified_at")
      .eq("user_id", userId);
    if (data.vehicleId) query = query.eq("id", data.vehicleId);
    const { data: vehicle, error: vErr } = await query
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (vErr) throw vErr;

    if (!vehicle) {
      return {
        serverNow,
        vehicle: null,
        state: null,
        signalLostNotifiedAt: null,
        lastSignalLost: null,
        pingsLastHour: 0,
        lastPing: null,
        lastTripEndedAt: null,
      };
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [stateRes, eventRes, pingCountRes, lastPingRes, tripRes] = await Promise.all([
      supabase
        .from("device_trip_state")
        .select("device_id,ignition_on,last_message_at,last_ping_at,updated_at")
        .eq("vehicle_id", vehicle.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tracker_events")
        .select("occurred_at,metadata")
        .eq("vehicle_id", vehicle.id)
        .eq("type", "signal_lost")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tracker_pings")
        .select("id", { count: "exact", head: true })
        .eq("vehicle_id", vehicle.id)
        .gte("recorded_at", hourAgo),
      supabase
        .from("tracker_pings")
        .select("recorded_at,lat,lng")
        .eq("vehicle_id", vehicle.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("end_time")
        .eq("vehicle_id", vehicle.id)
        .not("end_time", "is", null)
        .order("end_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const state = stateRes.data;
    const ping = lastPingRes.data;

    return {
      serverNow,
      vehicle: {
        id: vehicle.id as string,
        name: (vehicle.name as string) ?? "Veículo",
        deviceId: (vehicle.flespi_device_id as string | null) ?? null,
        trackerMode: vehicle.tracker_mode === true,
      },
      state: state
        ? {
            deviceId: state.device_id as string,
            ignitionOn: (state.ignition_on as boolean | null) ?? null,
            lastMessageAt: (state.last_message_at as string | null) ?? null,
            lastPingAt: (state.last_ping_at as string | null) ?? null,
            updatedAt: (state.updated_at as string | null) ?? null,
          }
        : null,
      signalLostNotifiedAt: (vehicle.signal_lost_notified_at as string | null) ?? null,
      lastSignalLost: eventRes.data
        ? {
            occurredAt: eventRes.data.occurred_at as string,
            metadata: (() => {
              const m = (eventRes.data.metadata ?? {}) as Record<string, unknown>;
              return {
                last_message_at:
                  typeof m["last_message_at"] === "string" ? (m["last_message_at"] as string) : null,
                threshold_min: Number.isFinite(Number(m["threshold_min"]))
                  ? Number(m["threshold_min"])
                  : null,
                parked: typeof m["parked"] === "boolean" ? (m["parked"] as boolean) : null,
              };
            })(),
          }
        : null,
      pingsLastHour: pingCountRes.count ?? 0,
      lastPing:
        ping && ping.lat != null && ping.lng != null
          ? {
              recordedAt: ping.recorded_at as string,
              lat: Number(ping.lat),
              lng: Number(ping.lng),
            }
          : null,
      lastTripEndedAt: (tripRes.data?.end_time as string | null) ?? null,
    };
  });
