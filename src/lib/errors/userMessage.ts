// Tradução de erros técnicos para mensagens que o usuário entende.
//
// Regra: erros que NÓS escrevemos de propósito (domínio) chegam ao usuário como
// estão. Erros de infraestrutura (banco, rede, autenticação) viram o fallback da
// ação — e o original vai para o console, para diagnóstico.

/** Erro intencional de domínio: a mensagem é para o usuário ler. */
export class AppError extends Error {
  readonly isAppError = true;
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

function isAppError(error: unknown): boolean {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { isAppError?: unknown }).isAppError === true)
  );
}

/** PostgrestError e afins: objeto de erro do Supabase/PostgREST. */
function looksLikePostgrestError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  return "code" in e && ("details" in e || "hint" in e);
}

/** Trechos que denunciam erro de infraestrutura, nunca mostrados ao usuário. */
const TECHNICAL_PATTERNS = [
  "row-level security",
  "row level security",
  "duplicate key",
  "violates",
  "constraint",
  "permission denied",
  "jwt",
  "unauthorized",
  "forbidden",
  "fetch failed",
  "failed to fetch",
  "networkerror",
  "load failed",
  "internal server error",
  "500",
  "syntaxerror",
  "typeerror",
  "undefined is not",
  "null is not",
  "supabase",
  "postgres",
  "pgrst",
  "relation ",
  "column ",
  "schema ",
  "sql",
];

function isTechnicalMessage(message: string): boolean {
  const m = message.toLowerCase();
  return TECHNICAL_PATTERNS.some((p) => m.includes(p));
}

/** Heurística: mensagem escrita por nós tem cara de frase em português. */
function looksLikeUserMessage(message: string): boolean {
  const m = message.trim();
  if (m.length < 8 || m.length > 200) return false;
  if (!/\s/.test(m)) return false;
  // precisa ter pelo menos uma palavra em português comum ou acento
  return (
    /[áàâãéêíóôõúüç]/i.test(m) ||
    /\b(não|de|da|do|em|para|por|no|na|com|sem|um|uma|ao|que|tente|verifique|precisamos|adicione|aguarde|inválid\w*|encontrad\w*|registrad\w*)\b/i.test(
      m,
    )
  );
}

/**
 * Devolve uma mensagem apresentável para o usuário.
 * Sempre registra o erro original no console.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  console.error("[erro]", error);

  if (isAppError(error)) {
    const msg = (error as Error).message?.trim();
    if (msg) return msg;
    return fallback;
  }

  if (looksLikePostgrestError(error)) return fallback;

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error !== null
          ? String((error as { message?: unknown }).message ?? "")
          : "";

  const message = raw.trim();
  if (!message) return fallback;
  if (isTechnicalMessage(message)) return fallback;
  if (!looksLikeUserMessage(message)) return fallback;

  return message;
}
