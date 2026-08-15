import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, toUserMessage } from "@/lib/errors/userMessage";

const FALLBACK = "Não foi possível salvar o motorista. Tente de novo.";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toUserMessage", () => {
  it("registra sempre o erro original no console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = new Error("row-level security policy");
    toUserMessage(original, FALLBACK);
    expect(spy).toHaveBeenCalledWith("[erro]", original);
  });

  it("usa o fallback para erros de infraestrutura", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const technical = [
      'new row violates row-level security policy for table "drivers"',
      'duplicate key value violates unique constraint "drivers_pkey"',
      "permission denied for table trips",
      "JWT expired",
      "TypeError: fetch failed",
      "Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "Internal Server Error",
    ];
    for (const message of technical) {
      expect(toUserMessage(new Error(message), FALLBACK)).toBe(FALLBACK);
    }
  });

  it("usa o fallback para PostgrestError", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pgError = {
      code: "42501",
      details: null,
      hint: null,
      message: "algo aconteceu aqui dentro",
    };
    expect(toUserMessage(pgError, FALLBACK)).toBe(FALLBACK);
  });

  it("deixa passar erros intencionais marcados com AppError", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const msg = "Precisamos de pelo menos 3 viagens registradas para gerar recomendações.";
    expect(toUserMessage(new AppError(msg), FALLBACK)).toBe(msg);
  });

  it("deixa passar mensagens de domínio já escritas em português", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const domain = [
      "Precisamos de pelo menos 3 viagens registradas para gerar recomendações.",
      "O coach de direção está indisponível no momento.",
      "Créditos de IA esgotados. Adicione créditos no workspace para continuar.",
      "A IA respondeu em formato inesperado. Tente novamente.",
      "Viagem não encontrada.",
    ];
    for (const message of domain) {
      expect(toUserMessage(new Error(message), FALLBACK)).toBe(message);
    }
  });

  it("usa o fallback para erro vazio, nulo ou fora do formato", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toUserMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage(new Error(""), FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage({ nope: 1 }, FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage("undefined_column", FALLBACK)).toBe(FALLBACK);
  });

  it("aceita string de domínio", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toUserMessage("Local sem coordenadas registradas.", FALLBACK)).toBe(
      "Local sem coordenadas registradas.",
    );
  });
});
