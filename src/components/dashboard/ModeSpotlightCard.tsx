import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useAccountMode } from "@/lib/account/profile";

/**
 * Destaque do perfil de uso no painel: mostra o foco do modo e
 * os recursos que chegam nas próximas fases. Não aparece para Motorista.
 */
export function ModeSpotlightCard() {
  const { mode, info, loading } = useAccountMode();
  if (loading || mode === "motorista") return null;

  return (
    <section className="card-surface border-primary/30 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          Modo {info.label}
        </span>
        <Link to="/perfil-de-uso" className="text-[11px] font-semibold text-primary">
          Trocar
        </Link>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">{info.tagline}</p>
      {info.upcoming.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {info.upcoming.map((item) => (
            <li
              key={item}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {item} · em breve
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
