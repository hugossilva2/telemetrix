import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Botão de sair reutilizável. Precisa estar disponível também para contas
 * observadoras, que não têm acesso à tela de Ajustes.
 */
export function SignOutButton({
  variant = "outline",
  size,
  label = "Sair da conta",
  className,
  iconOnly = false,
}: {
  variant?: "outline" | "ghost" | "secondary" | "destructive";
  size?: "sm" | "default" | "icon";
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabaseSignOut();
    toast.success("Você saiu.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Button
      onClick={handleSignOut}
      variant={variant}
      size={size ?? (iconOnly ? "icon" : "default")}
      className={className}
      aria-label={label}
      title={label}
    >
      <LogOut className={iconOnly ? "size-4" : "mr-2 size-4"} />
      {!iconOnly && label}
    </Button>
  );
}

async function supabaseSignOut() {
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.auth.signOut();
}
