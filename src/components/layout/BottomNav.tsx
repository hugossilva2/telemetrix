import { Link } from "@tanstack/react-router";
import { Car, Fuel, MapPin, Radar, Route as RouteIcon, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Painel", Icon: Car, exact: true },
  { to: "/rastreador", label: "Rastreio", Icon: Radar, exact: false },
  { to: "/lugares", label: "Lugares", Icon: MapPin, exact: false },
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
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {items.map(({ to, label, Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors hover:text-foreground active:bg-accent/40"
            >
              <Icon className="size-[22px]" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
