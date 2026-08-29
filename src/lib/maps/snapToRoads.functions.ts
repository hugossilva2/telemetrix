import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SnapInput, SnapResult, SnappedPoint } from "@/lib/maps/snapToRoads.server";

export type { SnapInput, SnapResult, SnappedPoint };

/**
 * Alinha a lista de coordenadas GPS à geometria real das ruas (Google Roads API).
 * Nunca lança para o app: em caso de falha retorna `snapped: false` para o
 * chamador cair no traçado bruto.
 */
export const snapToRoads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { points: SnapInput[] }) => input)
  .handler(async ({ data }): Promise<SnapResult> => {
    const { snapTrail } = await import("@/lib/maps/snapToRoads.server");
    return snapTrail(data.points ?? []);
  });
