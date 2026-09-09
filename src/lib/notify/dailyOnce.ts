import { localDayKey } from "@/lib/format";

/**
 * Marca um item como notificado no dia corrente.
 * Retorna true quando o item JÁ foi notificado hoje (ou quando não há
 * localStorage disponível), ou seja: quando o aviso deve ser suprimido.
 */
export function notifyOncePerDay(storeKey: string, itemKey: string): boolean {
  if (typeof window === "undefined") return true;
  const today = localDayKey();
  try {
    const raw = window.localStorage.getItem(storeKey);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (map[itemKey] === today) return true;
    map[itemKey] = today;
    window.localStorage.setItem(storeKey, JSON.stringify(map));
    return false;
  } catch {
    return true;
  }
}
