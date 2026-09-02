import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useIsStudent } from "@/lib/school/student";

const ALLOWED = new Set(["/aluno", "/ajustes", "/perfil-de-uso"]);

/**
 * Contas de aluno (convidadas por instrutor/autoescola, sem carro próprio)
 * ficam restritas à área "Meu progresso" e aos detalhes de viagem das aulas.
 */
export function StudentGate() {
  const { isStudent } = useIsStudent();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isStudent) return;
    if (ALLOWED.has(pathname) || pathname.startsWith("/viagens/")) return;
    navigate({ to: "/aluno", replace: true });
  }, [isStudent, pathname, navigate]);

  return null;
}
