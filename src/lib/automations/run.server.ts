/**
 * Execução de automações de cerca virtual (webhook de saída para casa
 * inteligente). Roda somente no servidor: a URL e o cabeçalho de autenticação
 * ficam protegidos por RLS e nunca são enviados ao navegador.
 */

export interface AutomationRow {
  id: string;
  user_id: string;
  place_id: string;
  trigger: string;
  enabled: boolean;
  url: string;
  method: string;
  body_json: string | null;
  header_name: string | null;
  header_value: string | null;
  cooldown_seconds: number;
  last_fired_at: string | null;
}

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
  /\.internal$/i,
];

export function validateAutomationUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "URL inválida" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Use uma URL http:// ou https://" };
  }
  const host = url.hostname;
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    return {
      ok: false,
      error:
        "Endereços locais/privados não são acessíveis pelo servidor. Exponha seu hub por um domínio público ou túnel (ex.: Nabu Casa, Cloudflare Tunnel).",
    };
  }
  return { ok: true, url };
}

export interface AutomationCallResult {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
}

export async function callAutomation(
  automation: Pick<AutomationRow, "url" | "method" | "body_json" | "header_name" | "header_value">,
  context: { placeName?: string; trigger?: string; lat?: number | null; lng?: number | null },
  timeoutMs = 8000,
): Promise<AutomationCallResult> {
  const valid = validateAutomationUrl(automation.url);
  if (!valid.ok) return { ok: false, statusCode: null, error: valid.error };

  const headers: Record<string, string> = {};
  if (automation.header_name && automation.header_value) {
    headers[automation.header_name] = automation.header_value;
  }

  const method = automation.method === "GET" ? "GET" : "POST";
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body =
      automation.body_json && automation.body_json.trim()
        ? automation.body_json
        : JSON.stringify({
            source: "telemetrix",
            trigger: context.trigger ?? null,
            place: context.placeName ?? null,
            lat: context.lat ?? null,
            lng: context.lng ?? null,
            at: new Date().toISOString(),
          });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(valid.url.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      statusCode: res.status,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, statusCode: null, error: msg.includes("abort") ? "Tempo esgotado" : msg };
  } finally {
    clearTimeout(timer);
  }
}

type AdminClient = {
  from: (table: string) => any;
};

/**
 * Dispara todas as automações ativas de um local para um gatilho, respeitando
 * o cooldown, e grava o histórico em `automation_runs`.
 */
export async function fireAutomationsForPlace(
  supabaseAdmin: AdminClient,
  params: {
    userId: string;
    placeId: string;
    placeName: string;
    trigger: "enter" | "exit";
    lat?: number | null;
    lng?: number | null;
    nowMs: number;
  },
) {
  const { data: automations } = await supabaseAdmin
    .from("place_automations")
    .select("*")
    .eq("place_id", params.placeId)
    .eq("trigger", params.trigger)
    .eq("enabled", true);

  if (!automations || automations.length === 0) return;

  for (const a of automations as AutomationRow[]) {
    const lastMs = a.last_fired_at ? new Date(a.last_fired_at).getTime() : 0;
    if (params.nowMs - lastMs < (a.cooldown_seconds || 0) * 1000) continue;

    const result = await callAutomation(a, {
      placeName: params.placeName,
      trigger: params.trigger,
      lat: params.lat,
      lng: params.lng,
    });

    await supabaseAdmin.from("automation_runs").insert({
      user_id: params.userId,
      automation_id: a.id,
      place_id: params.placeId,
      trigger: params.trigger,
      status_code: result.statusCode,
      ok: result.ok,
      error: result.error,
      manual: false,
    });

    await supabaseAdmin
      .from("place_automations")
      .update({ last_fired_at: new Date(params.nowMs).toISOString() })
      .eq("id", a.id);
  }
}
