import { AlertTriangle, LogIn, LogOut, MapPinOff, ShieldAlert } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export type TrackerEventType = Tables<"tracker_events">["type"];

export interface TrackerEventMeta {
  label: string;
  Icon: typeof LogIn;
  color: string;
  bg: string;
}

/** Rótulo, ícone e cores de cada tipo de evento do rastreador. */
export const EVENT_META: Record<TrackerEventType, TrackerEventMeta> = {
  ignition_on: { label: "Motor ligado", Icon: LogIn, color: "text-success", bg: "bg-success/10" },
  ignition_off: {
    label: "Motor desligado",
    Icon: LogOut,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  motion_off_ignition: {
    label: "Movimento suspeito",
    Icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  geofence_enter: {
    label: "Chegou na cerca",
    Icon: LogIn,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  geofence_exit: {
    label: "Saiu da cerca",
    Icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  signal_lost: {
    label: "Sinal perdido",
    Icon: MapPinOff,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};
