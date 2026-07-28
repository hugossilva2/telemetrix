import { useCallback, useEffect, useState } from "react";

/**
 * Histórico local das últimas partidas (para depurar / comparar).
 * Guardado apenas no dispositivo (localStorage).
 */
const HISTORY_KEY = "safeStart:history:v1";
const HISTORY_LIMIT = 20;
const HISTORY_EVENT = "safeStart:history:changed";

export interface SafeStartHistoryEntry {
  /** id = timestamp da partida */
  id: number;
  /** data/hora da partida (ms epoch) */
  startedAt: number;
  /** minutos que ficou parado antes da partida */
  offMinutes: number | null;
  /** menor rpm observado durante o aquecimento */
  minRpm: number | null;
  /** exigiu partida segura (>60 min parado) */
  required: boolean;
  /** chegou a liberar */
  ready: boolean;
  /** quando liberou (ms epoch) */
  readyAt: number | null;
}

export function readSafeStartHistory(): SafeStartHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as SafeStartHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(list: SafeStartHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

/** Cria ou atualiza a entrada da partida atual. */
export function upsertSafeStartEntry(entry: SafeStartHistoryEntry) {
  const list = readSafeStartHistory();
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.unshift(entry);
  writeHistory(list.sort((a, b) => b.startedAt - a.startedAt));
}

export function clearSafeStartHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function useSafeStartHistory() {
  const [history, setHistory] = useState<SafeStartHistoryEntry[]>([]);

  const refresh = useCallback(() => setHistory(readSafeStartHistory()), []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(HISTORY_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(HISTORY_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return { history, clear: clearSafeStartHistory, refresh };
}
