import { DEFAULT_ECO_THRESHOLDS, type EcoThresholds } from "./detect";

export interface EcoSettings {
  thresholds: EcoThresholds;
  liveAlerts: boolean;
}

const STORAGE_KEY = "ecoSettings:v1";

export const DEFAULT_ECO_SETTINGS: EcoSettings = {
  thresholds: DEFAULT_ECO_THRESHOLDS,
  liveAlerts: true,
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
    };
  } catch {
    return DEFAULT_ECO_SETTINGS;
  }
}

export function saveEcoSettings(next: EcoSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
