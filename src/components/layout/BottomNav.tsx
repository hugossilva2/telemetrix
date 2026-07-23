import { Link } from "@tanstack/react-router";
import { Car, Fuel, Map, Route as RouteIcon, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Painel", Icon: Car, exact: true },
  { to: "/mapa", label: "Mapa", Icon: Map, exact: false },
  { to: "/viagens", label: "Viagens", Icon: RouteIcon, exact: false },
  { to: "/abastecimento", label: "Abastecer", Icon: Fuel, exact: false },
  { to: "/ajustes", label: "Ajustes", Icon: Settings, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors hover:text-foreground"
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
