import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/recursos", label: "Recursos" },
  { to: "/precos", label: "Preços" },
  { to: "/demo", label: "Demonstração" },
] as const;

/** Cabeçalho compartilhado pelas páginas públicas de marketing. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
            <Activity className="size-4" />
          </span>
          Telemetrix
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Criar conta</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
