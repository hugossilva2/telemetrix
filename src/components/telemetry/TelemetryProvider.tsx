import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";
import { useOBD2Local } from "@/hooks/useOBD2Local";
import { useTelemetrySource } from "@/lib/telemetry/source";
import type { TelemetryState } from "@/lib/telemetry/types";

const initialState: TelemetryState = {
  source: "fmc003",
  status: "idle",
  data: {},
  lastMessageAt: null,
  error: null,
};

const TelemetryContext = createContext<TelemetryState>(initialState);

/** Estado unificado de telemetria, independente da fonte de hardware. */
export function useTelemetryContext(): TelemetryState {
  return useContext(TelemetryContext);
}

type Publish = (s: TelemetryState) => void;

/** Adapter da nuvem (Teltonika FMC003 via Flespi MQTT). */
function FlespiBridge({ publish }: { publish: Publish }) {
  const { status, telemetry, lastMessageAt, error } = useFlespiMqtt();

  useEffect(() => {
    publish({
      source: "fmc003",
      status,
      data: telemetry,
      lastMessageAt,
      error,
      supported: true,
    });
  }, [publish, status, telemetry, lastMessageAt, error]);

  return null;
}

/** Adapter local (ELM327 via Web Bluetooth + GPS do celular). */
function ObdBridge({ publish }: { publish: Publish }) {
  const {
    status,
    telemetry,
    lastMessageAt,
    error,
    supported,
    deviceName,
    savedDevice,
    forgetDevice,
    connect,
    disconnect,
  } = useOBD2Local(true);

  useEffect(() => {
    publish({
      source: "elm327",
      status,
      data: telemetry,
      lastMessageAt,
      error,
      supported,
      deviceName,
      savedDevice,
      forgetDevice,
      connect,
      disconnect,
    });
  }, [
    publish,
    status,
    telemetry,
    lastMessageAt,
    error,
    supported,
    deviceName,
    savedDevice,
    forgetDevice,
    connect,
    disconnect,
  ]);

  return null;
}


export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { source } = useTelemetrySource();
  const [state, setState] = useState<TelemetryState>(initialState);

  // Ao trocar de fonte, limpa o estado para não exibir dados da fonte anterior.
  useEffect(() => {
    setState({ ...initialState, source });
  }, [source]);

  return (
    <TelemetryContext.Provider value={state}>
      {source === "elm327" ? (
        <ObdBridge publish={setState} />
      ) : (
        <FlespiBridge publish={setState} />
      )}
      {children}
    </TelemetryContext.Provider>
  );
}
