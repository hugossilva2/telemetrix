import { Link } from "@tanstack/react-router";
import {
  Car,
  Eye,
  Fuel,
  FolderCog,
  Radar,
  Route as RouteIcon,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useIsObserver } from "@/lib/shares/observer";
import { useAccountMode } from "@/lib/account/profile";
import type { AccountMode } from "@/lib/account/mode";

interface NavItem {
  to: "/inicio" | "/rastreador" | "/viagens" | "/abastecimento" | "/gestao" | "/ajustes" | "/despesas" | "/motoristas";
  label: string;
  Icon: LucideIcon;
  exact: boolean;
}

const base = {
  painel: { to: "/inicio", label: "Painel", Icon: Car, exact: true },
  rastreio: { to: "/rastreador", label: "Rastreio", Icon: Radar, exact: false },
  viagens: { to: "/viagens", label: "Viagens", Icon: RouteIcon, exact: false },
  abastecer: { to: "/abastecimento", label: "Abastecer", Icon: Fuel, exact: false },
  gestao: { to: "/gestao", label: "Gestão", Icon: FolderCog, exact: false },
  ajustes: { to: "/ajustes", label: "Ajustes", Icon: Settings, exact: false },
  despesas: { to: "/despesas", label: "Gastos", Icon: Wallet, exact: false },
  equipe: { to: "/motoristas", label: "Equipe", Icon: Users, exact: false },
} satisfies Record<string, NavItem>;

/** Menu inferior por perfil de uso. Motorista mantém o menu original. */
const NAV_BY_MODE: Record<AccountMode, NavItem[]> = {
  motorista: [base.painel, base.rastreio, base.viagens, base.abastecer, base.gestao, base.ajustes],
  app: [base.painel, base.viagens, base.abastecer, base.despesas, base.gestao, base.ajustes],
  instrutor: [base.painel, base.rastreio, base.viagens, base.abastecer, base.gestao, base.ajustes],
  autoescola: [base.painel, base.rastreio, base.viagens, base.equipe, base.gestao, base.ajustes],
};

const observerItems: NavItem[] = [
  { to: "/rastreador", label: "Rastreio", Icon: Eye, exact: false },
];

export function BottomNav() {
  const { isObserver } = useIsObserver();
  const { mode } = useAccountMode();
  const navItems = isObserver ? observerItems : NAV_BY_MODE[mode];

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
