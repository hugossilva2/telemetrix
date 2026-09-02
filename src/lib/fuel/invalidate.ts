import type { QueryClient } from "@tanstack/react-query";

/**
 * Consultas que dependem de abastecimentos/despesas para calcular consumo
 * (km/L), custo por km, autonomia e relatórios. Sempre que um lançamento é
 * criado, editado ou removido, todas precisam ser recalculadas.
 */
const FUEL_DEPENDENT_KEYS = [
  ["fuel_logs"],
  ["expenses"],
  ["live-consumption-refs"],
  ["tank-fills"],
  ["report"],
  ["report-week"],
  ["trends-trips"],
  ["eco-trips"],
  ["profit-costs"],
] as const;

export function invalidateFuelMetrics(qc: QueryClient) {
  for (const key of FUEL_DEPENDENT_KEYS) {
    qc.invalidateQueries({ queryKey: key as unknown as unknown[] });
  }
}
