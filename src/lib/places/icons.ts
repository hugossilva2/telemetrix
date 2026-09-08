import { Briefcase, Dumbbell, Home, MapPin } from "lucide-react";

export const ICON_OPTIONS = [
  { key: "home", label: "Casa", Icon: Home },
  { key: "work", label: "Trabalho", Icon: Briefcase },
  { key: "gym", label: "Academia", Icon: Dumbbell },
  { key: "pin", label: "Outro", Icon: MapPin },
] as const;

export type IconKey = (typeof ICON_OPTIONS)[number]["key"];

export function iconFor(key: string) {
  return ICON_OPTIONS.find((o) => o.key === key)?.Icon ?? MapPin;
}
