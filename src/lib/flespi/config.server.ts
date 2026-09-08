/**
 * Credencial da REST API da Flespi — SOMENTE servidor.
 *
 * Lida dentro da função (a env só existe em tempo de execução) e nunca
 * exposta ao browser.
 */
export function flespiServerToken(): string {
  const token = process.env["FLESPI_TOKEN"];
  if (!token) throw new Error("FLESPI_TOKEN não configurado");
  return token;
}

export function flespiAuthHeaders(): Record<string, string> {
  return { Authorization: `FlespiToken ${flespiServerToken()}` };
}
