import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .inputValidator((input: { type: string; placeName?: string | null; vehicleId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { sendTrackerEventPush } = await import("./send.server");
    let vehicleId = data.vehicleId ?? null;
    if (!vehicleId) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      vehicleId = v?.id ?? null;
    }
    return sendTrackerEventPush(context.userId, data.type, {
      placeName: data.placeName ?? null,
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
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { sendLongTripAlertPush } = await import("./send.server");
    let vehicleId = data.vehicleId ?? null;
    if (!vehicleId) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("id")
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
