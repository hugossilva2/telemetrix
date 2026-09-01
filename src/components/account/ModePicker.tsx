import { Briefcase, Car, Check, GraduationCap, School } from "lucide-react";
import { ACCOUNT_MODES, ACCOUNT_MODE_INFO, type AccountMode } from "@/lib/account/mode";
import { cn } from "@/lib/utils";

const ICONS: Record<AccountMode, typeof Car> = {
  motorista: Car,
  app: Briefcase,
  instrutor: GraduationCap,
  autoescola: School,
};

interface ModePickerProps {
  value: AccountMode;
  onChange: (mode: AccountMode) => void;
  disabled?: boolean;
}

/** Cartões de escolha do perfil de uso da conta. */
export function ModePicker({ value, onChange, disabled }: ModePickerProps) {
  return (
    <div role="radiogroup" aria-label="Perfil de uso" className="grid gap-2">
      {ACCOUNT_MODES.map((id) => {
        const info = ACCOUNT_MODE_INFO[id];
        const Icon = ICONS[id];
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
              "card-surface flex items-start gap-3 p-4 text-left transition-colors",
              selected ? "border-primary/70 bg-primary/10" : "hover:border-primary/40",
              disabled && "opacity-60",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {info.label}
                {selected && <Check className="size-4 text-primary" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{info.tagline}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {info.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {h}
                  </span>
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
