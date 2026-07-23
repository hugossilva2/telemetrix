import { useTripRecorder } from "@/hooks/useTripRecorder";

/** Componente invisível que roda o recorder enquanto o usuário está logado. */
export function TripRecorder() {
  useTripRecorder();
  return null;
}
