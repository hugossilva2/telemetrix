const nfInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatKm = (v?: number) => (v === undefined ? "—" : `${nfInt.format(v)} km`);
export const formatSpeed = (v?: number) => (v === undefined ? "—" : `${nfInt.format(v)} km/h`);
export const formatBRL = (v?: number) => (v === undefined ? "—" : brl.format(v));
export const formatDecimal = (v?: number) => (v === undefined ? "—" : nf2.format(v));

/** ETA em texto curto: "12 min", "1 h", "1h30". */
export function formatEta(seconds: number, minMinutes = 0): string {
  const m = Math.max(minMinutes, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h}h${rest.toString().padStart(2, "0")}`;
}
