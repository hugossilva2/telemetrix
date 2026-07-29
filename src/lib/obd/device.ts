/**
 * Memória do adaptador ELM327 pareado.
 *
 * Guarda no localStorage o último adaptador usado para que o app saiba
 * diferenciar o primeiro pareamento de uma simples reconexão. Também replica
 * o registro no veículo do usuário (Supabase) na primeira vez.
 */

import { supabase } from "@/integrations/supabase/client";

const KEY = "telemetrix:obd-device";

export interface SavedObdDevice {
  id: string;
  name: string | null;
  firstPairedAt: number;
  lastConnectedAt: number;
}

type Listener = (d: SavedObdDevice | null) => void;
const listeners = new Set<Listener>();
let cache: SavedObdDevice | null | undefined;

function read(): SavedObdDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedObdDevice;
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function emit(next: SavedObdDevice | null) {
  cache = next;
  listeners.forEach((l) => l(next));
}

export const obdDeviceStore = {
  get(): SavedObdDevice | null {
    if (cache === undefined) cache = read();
    return cache;
  },
  /** Registra a conexão. Preserva `firstPairedAt` se o mesmo aparelho já era conhecido. */
  remember(device: { id: string; name: string | null }): SavedObdDevice {
    const prev = obdDeviceStore.get();
    const now = Date.now();
    const next: SavedObdDevice = {
      id: device.id,
      name: device.name ?? prev?.name ?? null,
      firstPairedAt: prev && prev.id === device.id ? prev.firstPairedAt : now,
      lastConnectedAt: now,
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    }
    emit(next);
    void syncToVehicle(next);
    return next;
  },
  forget() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    emit(null);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Grava o adaptador no veículo do usuário (best-effort, nunca quebra a conexão). */
async function syncToVehicle(device: SavedObdDevice) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, obd_first_paired_at")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (!vehicle?.id) return;
    await supabase
      .from("vehicles")
      .update({
        obd_device_id: device.id,
        obd_device_name: device.name,
        obd_first_paired_at:
          vehicle.obd_first_paired_at ?? new Date(device.firstPairedAt).toISOString(),
      })
      .eq("id", vehicle.id);
  } catch {
    /* offline ou sem veículo: ignora */
  }
}
