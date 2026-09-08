import { DEFAULT_ECO_THRESHOLDS, type EcoThresholds } from "./detect";
import type { FuelKind } from "@/lib/vehicles/specs";

export interface EcoSettings {
  thresholds: EcoThresholds;
  liveAlerts: boolean;
  /**
   * Cache de leitura offline do combustível em uso. A fonte de verdade é a
   * coluna `vehicles.fuel_kind` do veículo ativo — este valor só é usado
   * quando o veículo ainda não carregou (offline / primeiro render).
   */
  fuel: FuelKind;
}

const STORAGE_KEY = "ecoSettings:v1";

export const DEFAULT_ECO_SETTINGS: EcoSettings = {
  thresholds: DEFAULT_ECO_THRESHOLDS,
  liveAlerts: true,
  fuel: "misto",
};

export function getEcoSettings(): EcoSettings {
  if (typeof window === "undefined") return DEFAULT_ECO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ECO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<EcoSettings>;
    return {
      thresholds: { ...DEFAULT_ECO_THRESHOLDS, ...(parsed.thresholds ?? {}) },
      liveAlerts: parsed.liveAlerts ?? true,
      fuel: parsed.fuel ?? "misto",
    };
  } catch {
    return DEFAULT_ECO_SETTINGS;
  }
}

export function saveEcoSettings(next: EcoSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Combustível em uso a partir do cache local. Prefira `useActiveVehicle().fuel`
 * (vehicles.fuel_kind) em código React; esta função existe para caminhos fora
 * do React e para leitura offline.
 */
export function getFuelKind(): FuelKind {
  return getEcoSettings().fuel;
}

/** Atualiza o cache local com o combustível do veículo ativo (vehicles.fuel_kind). */
export function cacheFuelKind(fuel: FuelKind) {
  if (typeof window === "undefined") return;
  const current = getEcoSettings();
  if (current.fuel === fuel) return;
  saveEcoSettings({ ...current, fuel });
}
