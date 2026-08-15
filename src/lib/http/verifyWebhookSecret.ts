/**
 * Verificação compartilhada dos endpoints públicos do rastreador.
 *
 * Regras:
 * - o segredo é lido dentro da função (env só existe em tempo de execução);
 * - sem `FLESPI_WEBHOOK_SECRET` configurado, falha fechada (nunca autoriza);
 * - aceita o segredo somente via header `x-webhook-secret` ou query `?secret=`;
 * - comparação em tempo constante para não vazar o prefixo correto por timing.
 */

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) {
    diff |= ba[i]! ^ bb[i]!;
  }
  return diff === 0;
}

export function verifyWebhookSecret(request: Request, url?: URL): boolean {
  const expected = process.env.FLESPI_WEBHOOK_SECRET;
  if (!expected) return false;

  const parsedUrl = url ?? new URL(request.url);
  const provided =
    request.headers.get("x-webhook-secret") ??
    parsedUrl.searchParams.get("secret");
  if (!provided) return false;

  return timingSafeEqualStrings(provided, expected);
}
