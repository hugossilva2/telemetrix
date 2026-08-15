import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Testa manualmente uma automação de cerca virtual já salva. */
export const testAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { automationId: string }) => {
    if (!input?.automationId) throw new Error("Automação não informada");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: automation, error } = await supabase
      .from("place_automations")
      .select("*, favorite_places(name)")
      .eq("id", data.automationId)
      .maybeSingle();
    if (error) {
      console.error("[automations] falha ao carregar a automação", error);
      throw new Error("Não foi possível carregar a automação.");
    }
    if (!automation) throw new Error("Automação não encontrada");

    const { callAutomation } = await import("@/lib/automations/run.server");
    const result = await callAutomation(automation as never, {
      placeName: (automation as { favorite_places?: { name?: string } }).favorite_places?.name,
      trigger: (automation as { trigger: string }).trigger,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("automation_runs").insert({
      user_id: userId,
      automation_id: (automation as { id: string }).id,
      place_id: (automation as { place_id: string }).place_id,
      trigger: (automation as { trigger: string }).trigger,
      status_code: result.statusCode,
      ok: result.ok,
      error: result.error,
      manual: true,
    });


    return result;
  });
