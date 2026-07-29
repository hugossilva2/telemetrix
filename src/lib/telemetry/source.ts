import { useEffect, useState } from "react";
import type { TelemetrySource } from "./types";

const KEY = "telemetrix:source";
const DEFAULT: TelemetrySource = "fmc003";

type Listener = (s: TelemetrySource) => void;
const listeners = new Set<Listener>();
let current: TelemetrySource | null = null;

function read(): TelemetrySource {
  if (typeof window === "undefined") return DEFAULT;
  const v = window.localStorage.getItem(KEY);
  return v === "elm327" || v === "fmc003" ? v : DEFAULT;
}

export const telemetrySourceStore = {
  get(): TelemetrySource {
    if (current === null) current = read();
    return current;
  },
  set(next: TelemetrySource) {
    current = next;
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, next);
    listeners.forEach((l) => l(next));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

};

/** Preferência do usuário para a fonte de dados, persistida no localStorage. */
export function useTelemetrySource() {
  const [source, setState] = useState<TelemetrySource>(DEFAULT);

  useEffect(() => {
    setState(telemetrySourceStore.get());
    return telemetrySourceStore.subscribe(setState);
  }, []);

  return {
    source,
    setSource: (s: TelemetrySource) => telemetrySourceStore.set(s),
  };
}
