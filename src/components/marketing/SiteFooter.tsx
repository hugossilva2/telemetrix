import { Link } from "@tanstack/react-router";

/** Rodapé compartilhado pelas páginas públicas de marketing. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        <div>
          <p className="font-display text-sm font-bold">Telemetrix</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Telemetria, viagens e rastreamento do seu carro no celular.
          </p>
        </div>
        <nav className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Produto</span>
          <Link to="/recursos" className="hover:text-foreground">
            Recursos
          </Link>
          <Link to="/precos" className="hover:text-foreground">
            Preços
          </Link>
          <Link to="/demo" className="hover:text-foreground">
            Demonstração
          </Link>
        </nav>
        <nav className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Casos de uso</span>
          <Link to="/casos-de-uso/$slug" params={{ slug: "motorista" }} className="hover:text-foreground">
            Motorista do dia a dia
          </Link>
          <Link to="/casos-de-uso/$slug" params={{ slug: "familia" }} className="hover:text-foreground">
            Família
          </Link>
          <Link to="/casos-de-uso/$slug" params={{ slug: "frota" }} className="hover:text-foreground">
            Pequena frota
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-5xl text-xs text-muted-foreground">
        © {new Date().getFullYear()} Telemetrix. Todos os direitos reservados.
      </p>
    </footer>
  );
}
