import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "./config";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushSupport =
  | "ok"
  | "unsupported"
  | "no-service-worker"
  | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;

  // O primeiro acesso após instalar pode acontecer enquanto o worker ainda ativa.
  // A espera limitada evita informar incorretamente que o app não está instalado.
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000));
  return Promise.race([ready, timeout]);
}

/** Retorna true se este dispositivo já está inscrito para receber push. */
export async function isPushEnabled(): Promise<boolean> {
  if (pushSupport() !== "ok") return false;
  const reg = await readyRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return sub != null;
}

/** Pede permissão, inscreve o dispositivo e salva no Supabase. */
export async function enablePush(): Promise<void> {
  const support = pushSupport();
  if (support === "unsupported") throw new Error("Este navegador não suporta notificações push.");
  if (support === "denied") {
    throw new Error("Notificações bloqueadas. Libere nas configurações do navegador.");
  }

  const reg = await readyRegistration();
  if (!reg) {
    throw new Error(
      "Instale o app na tela de início (app publicado) para ativar as notificações.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação não concedida.");

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error("Não foi possível ler as chaves da inscrição.");

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sessão expirada.");

  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: uid,
    endpoint: sub.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 200),
  });
  if (error) throw error;
}

/** Cancela a inscrição deste dispositivo. */
export async function disablePush(): Promise<void> {
  const reg = await readyRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
