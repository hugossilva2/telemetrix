import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Eventos aceitos do app (mesmos nomes usados pelo rastreador). */
const ALLOWED_EVENT_TYPES = new Set([
  "ignition_on",
  "ignition_off",
  "motion_off_ignition",
  "geofence_enter",
  "geofence_exit",
  "signal_lost",
]);

const ALLOWED_ALERT_KINDS = new Set(["descanso", "combustivel", "combustivel-critico"]);

function clamp(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Confere que a conta pode emitir eventos do veículo (dono ou equipe da
 * organização dona). Sem autorização, o veículo é descartado — o alerta segue
 * só para o próprio usuário, nunca para observadores de outra conta.
 */
async function authorizedVehicleId(
  supabase: {
    rpc: (fn: "can_use_vehicle", args: { _vehicle_id: string }) => PromiseLike<{ data: unknown }>;
  },
  vehicleId: string | null,
): Promise<string | null> {
  if (!vehicleId) return null;
  const { data } = await supabase.rpc("can_use_vehicle", { _vehicle_id: vehicleId });
  return data === true ? vehicleId : null;
}

/** Dispara uma notificação de teste para os dispositivos do próprio usuário. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("./send.server");
    return sendPushToUser(context.userId, {
      title: "Telemetrix",
      body: "Notificações ativadas com sucesso.",
      url: "/inicio",
      tag: "test",
    });
  });

/**
 * Notifica um evento do rastreador gerado no próprio app (motor, movimento,
 * geofence detectados localmente pelo OBD/GPS do celular).
 */
export const notifyTrackerEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { type: string; placeName?: string | null; vehicleId?: string | null }) => ({
      type: clamp(input?.type, 40),
      placeName: input?.placeName ? clamp(input.placeName, 80) : null,
      vehicleId: input?.vehicleId ? String(input.vehicleId) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    if (!ALLOWED_EVENT_TYPES.has(data.type)) return { sent: 0, failed: 0, removed: 0 };
    const { sendTrackerEventPush } = await import("./send.server");
    let vehicleId = await authorizedVehicleId(context.supabase, data.vehicleId);
    if (!vehicleId) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("id")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      vehicleId = v?.id ?? null;
    }
    return sendTrackerEventPush(context.userId, data.type, {
      placeName: data.placeName,
      vehicleId,
    });
  });

/** Envia um alerta do Modo Viagem Longa para o dono e para os observadores. */
export const notifyLongTripAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind: string;
      key: string;
      title: string;
      description: string;
      vehicleId?: string | null;
    }) => ({
      kind: clamp(input?.kind, 40),
      key: clamp(input?.key, 80),
      title: clamp(input?.title, 80),
      description: clamp(input?.description, 200),
      vehicleId: input?.vehicleId ? String(input.vehicleId) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    if (!ALLOWED_ALERT_KINDS.has(data.kind) || !data.title) {
      return { sent: 0, failed: 0, removed: 0 };
    }
    const { sendLongTripAlertPush } = await import("./send.server");
    let vehicleId = await authorizedVehicleId(context.supabase, data.vehicleId);
    if (!vehicleId) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("id")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      vehicleId = v?.id ?? null;
    }
    return sendLongTripAlertPush(
      context.userId,
      {
        kind: data.kind,
        key: data.key,
        title: data.title,
        description: data.description,
      },
      { vehicleId },
    );
  });
