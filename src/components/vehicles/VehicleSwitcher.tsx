import { Car, ChevronDown, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveVehicle } from "@/lib/vehicles/active";

/** Seletor do veículo ativo, exibido no header do app. */
export function VehicleSwitcher() {
  const { vehicles, vehicle, setVehicleId, loading } = useActiveVehicle();

  if (loading && !vehicle) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-[9.5rem] items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs font-semibold">
        <Car className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">{vehicle?.name ?? "Veículos"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Meus veículos</DropdownMenuLabel>
        {vehicles.length === 0 && (
          <DropdownMenuItem disabled>Nenhum veículo cadastrado</DropdownMenuItem>
        )}
        {vehicles.map((v) => (
          <DropdownMenuItem
            key={v.id}
            onSelect={() => setVehicleId(v.id)}
            className={v.id === vehicle?.id ? "font-semibold text-primary" : ""}
          >
            <span className="truncate">{v.name}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{v.plate}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/veiculos" className="flex items-center gap-2">
            <Plus className="size-3.5" /> Gerenciar veículos
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
