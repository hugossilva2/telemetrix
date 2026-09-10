import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/errors/userMessage";

interface Props {
  /** Erro devolvido pela consulta. */
  error: unknown;
  /** Mensagem padrão quando o erro é técnico. */
  fallback?: string;
  /** Recarrega a consulta. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Estado "indisponível": erro de leitura deixa de parecer "nenhum registro".
 * Mostra o motivo em português e um botão para tentar de novo.
 */
export function LoadFailed({ error, fallback, onRetry, className }: Props) {
  const message = toUserMessage(
    error,
    fallback ?? "Não foi possível carregar os dados agora. Verifique sua conexão.",
  );

  return (
    <div className={className ?? "card-surface p-4"}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Não foi possível carregar</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <RotateCw className="size-3.5" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
