const nfInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatKm = (v?: number) => (v === undefined ? "—" : `${nfInt.format(v)} km`);
export const formatSpeed = (v?: number) => (v === undefined ? "—" : `${nfInt.format(v)} km/h`);
export const formatRpm = (v?: number) => (v === undefined ? "—" : nfInt.format(v));
export const formatVolts = (v?: number) => (v === undefined ? "—" : `${nf1.format(v)} V`);
export const formatPct = (v?: number) => (v === undefined ? "—" : `${nfInt.format(v)} %`);
export const formatBRL = (v?: number) => (v === undefined ? "—" : brl.format(v));
export const formatDecimal = (v?: number) => (v === undefined ? "—" : nf2.format(v));
