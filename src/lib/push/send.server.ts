import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { PushPayload } from "./config";

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function vapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:push@telemetrix.app";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/**
 * Envia uma notificação Web Push para todos os dispositivos do usuário.
 * Remove automaticamente as inscrições expiradas (404/410).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; removed: number }> {
  const keys = vapid();
  if (!keys) return { sent: 0, failed: 0, removed: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  if (error) throw error;

  const subs = (data ?? []) as SubRow[];
  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        const req = await buildPushPayload(
          { data: { ...payload } as Record<string, string | undefined>, options: { ttl: 60 * 60, urgency: "high", topic: payload.tag } },
          {
            endpoint: s.endpoint,
            expirationTime: null,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          keys,
        );
        const res = await fetch(s.endpoint, {
          method: req.method,
          headers: req.headers,
          body: req.body as unknown as BodyInit,
        });
        if (res.ok) {
          sent += 1;
        } else if (res.status === 404 || res.status === 410) {
          dead.push(s.id);
        } else {
          failed += 1;
          console.error(`push falhou [${res.status}]: ${await res.text()}`);
        }
      } catch (e) {
        failed += 1;
        console.error("push erro:", e);
      }
    }),
  );

  if (dead.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
  }

  return { sent, failed, removed: dead.length };
}

const EVENT_COPY: Record<string, { title: string; body: string; url: string }> = {
  ignition_on: { title: "Veículo ligado", body: "A ignição foi acionada.", url: "/rastreador" },
  ignition_off: { title: "Veículo desligado", body: "A ignição foi desligada.", url: "/rastreador" },
  motion_off_ignition: {
    title: "Movimento com motor desligado",
    body: "O veículo se moveu sem a ignição ligada.",
    url: "/rastreador",
  },
  geofence_enter: { title: "Chegou em um local salvo", body: "O veículo entrou na cerca virtual.", url: "/rastreador" },
  geofence_exit: { title: "Saiu de um local salvo", body: "O veículo saiu da cerca virtual.", url: "/rastreador" },
  signal_lost: {
    title: "Sinal perdido",
    body: "Sem comunicação com o veículo há mais de 10 minutos.",
    url: "/rastreador",
  },
};

/** Observadores ativos (não revogados) de um veículo. */
async function observerIdsForVehicle(vehicleId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("vehicle_shares")
    .select("viewer_user_id")
    .eq("vehicle_id", vehicleId)
    .is("revoked_at", null)
    .not("viewer_user_id", "is", null);
  if (error) {
    console.error("observadores do veículo:", error.message);
    return [];
  }
  return Array.from(
    new Set((data ?? []).map((r) => r.viewer_user_id as string).filter(Boolean)),
  );
}

/** Notificação padronizada para um evento do rastreador. */
export async function sendTrackerEventPush(
  userId: string,
  type: string,
  extra?: { placeName?: string | null; vehicleId?: string | null },
) {
  const copy = EVENT_COPY[type];
  if (!copy) return { sent: 0, failed: 0, removed: 0 };
  const place = extra?.placeName;
  const body =
    place && (type === "geofence_enter" || type === "geofence_exit")
      ? type === "geofence_enter"
        ? `O veículo chegou em ${place}.`
        : `O veículo saiu de ${place}.`
      : copy.body;

  const result = await sendPushToUser(userId, {
    title: `Telemetrix · ${copy.title}`,
    body,
    url: copy.url,
    tag: type,
  });

  // Espelha o alerta para as contas observadoras do veículo (somente leitura).
  if (extra?.vehicleId) {
    const observers = (await observerIdsForVehicle(extra.vehicleId)).filter(
      (id) => id !== userId,
    );
    for (const observerId of observers) {
      const r = await sendPushToUser(observerId, {
        title: `Telemetrix · ${copy.title}`,
        body,
        url: "/acompanhar",
        tag: type,
      });
      result.sent += r.sent;
      result.failed += r.failed;
      result.removed += r.removed;
    }
  }

  return result;
}
