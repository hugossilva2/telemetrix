/**
 * Paginação de leituras: consultas com `.limit(500)`/`.limit(1000)` cortavam
 * silenciosamente o histórico de contas antigas, fazendo relatórios mostrarem
 * números menores que a realidade. Aqui lemos em páginas até o fim, com um
 * teto de segurança para não varrer o banco sem limite.
 */

export const PAGE_SIZE = 1000;

/** Teto de segurança: acima disso paramos e o chamador trata como completo. */
export const MAX_ROWS = 20_000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Lê todas as páginas de uma consulta. `build(from, to)` deve devolver a
 * consulta já com `.range(from, to)` aplicado.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options?: { pageSize?: number; maxRows?: number },
): Promise<T[]> {
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const maxRows = options?.maxRows ?? MAX_ROWS;
  const out: T[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const { data, error } = await build(from, to);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }

  return out;
}
