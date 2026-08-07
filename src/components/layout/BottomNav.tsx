import { Link } from "@tanstack/react-router";
import { Car, Eye, Fuel, FolderCog, Radar, Route as RouteIcon, Settings } from "lucide-react";
import { useIsObserver } from "@/lib/shares/observer";

const items = [
  { to: "/inicio", label: "Painel", Icon: Car, exact: true },
  { to: "/rastreador", label: "Rastreio", Icon: Radar, exact: false },
  { to: "/viagens", label: "Viagens", Icon: RouteIcon, exact: false },
  { to: "/abastecimento", label: "Abastecer", Icon: Fuel, exact: false },
  { to: "/gestao", label: "Gestão", Icon: FolderCog, exact: false },
  { to: "/ajustes", label: "Ajustes", Icon: Settings, exact: false },
] as const;

const observerItems = [
  { to: "/acompanhar", label: "Rastreio", Icon: Eye, exact: false },
] as const;

export function BottomNav() {
  const { isObserver } = useIsObserver();
  const navItems = isObserver ? observerItems : items;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className={`mx-auto grid max-w-md px-1 py-1 ${
          isObserver ? "grid-cols-1" : "grid-cols-6"
        }`}
      >
        {navItems.map(({ to, label, Icon, exact }) => (

          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              activeProps={{
                className:
                  "text-primary [&>span:first-child]:bg-primary/15 [&>span:first-child]:shadow-[0_0_20px_-6px_var(--primary)]",
              }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors hover:text-foreground"
            >
              <span className="grid h-7 w-11 place-items-center rounded-full transition-all">
                <Icon className="size-[19px]" />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
