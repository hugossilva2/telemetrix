import { supabase } from "@/integrations/supabase/client";
import { getDefaultDriverId } from "@/lib/drivers/api";
import type { SafeStartHistoryEntry } from "./safeStartHistory";

/**
 * Espelha a partida segura no banco (por motorista), para alimentar o perfil.
 * Falhas são silenciosas: o histórico local continua sendo a fonte imediata.
 */
export async function syncSafeStart(entry: SafeStartHistoryEntry) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const driverId = await getDefaultDriverId(userId);

    await supabase.from("safe_starts").upsert(
      {
        user_id: userId,
        driver_id: driverId,
        local_id: entry.id,
        started_at: new Date(entry.startedAt).toISOString(),
        off_minutes: entry.offMinutes,
        min_rpm: entry.minRpm,
        required: entry.required,
        ready: entry.ready,
        ready_at: entry.readyAt ? new Date(entry.readyAt).toISOString() : null,
      },
      { onConflict: "user_id,local_id" },
    );
  } catch {
    // silencioso — sincronização é best-effort
  }
}
