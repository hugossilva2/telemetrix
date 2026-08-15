import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Dumbbell, Home, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getPlaceDetails, searchPlaces, type PlaceSuggestion } from "@/lib/places.functions";
import { StartTripDialog, useStartTripDialog } from "@/components/trips/StartTripDialog";
import { PlaceAutomationPanel } from "@/components/places/PlaceAutomationPanel";


export const Route = createFileRoute("/_authenticated/lugares")({
  head: () => ({
    meta: [
      { title: "Locais · Telemetrix" },
      { name: "description", content: "Salve locais frequentes e veja ETA em tempo real." },
      { property: "og:title", content: "Locais · Telemetrix" },
      { property: "og:description", content: "Casa, trabalho, academia — com ETA de trânsito." },
    ],
  }),
  component: LugaresPage,
});

const ICON_OPTIONS = [
  { key: "home", label: "Casa", Icon: Home },
  { key: "work", label: "Trabalho", Icon: Briefcase },
  { key: "gym", label: "Academia", Icon: Dumbbell },
  { key: "pin", label: "Outro", Icon: MapPin },
] as const;

type IconKey = (typeof ICON_OPTIONS)[number]["key"];

export function iconFor(key: string) {
  return ICON_OPTIONS.find((o) => o.key === key)?.Icon ?? MapPin;
}

function LugaresPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchPlaces);
  const details = useServerFn(getPlaceDetails);
  const startTrip = useStartTripDialog();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IconKey>("home");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<{
    placeId: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: places = [] } = useQuery({
    queryKey: ["favorite_places"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_places")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["places-suggest", debounced],
    enabled: debounced.trim().length >= 2 && !selected,
    queryFn: () => search({ data: { query: debounced } }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um endereço na lista");
      if (!name.trim()) throw new Error("Dê um apelido ao local");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Faça login novamente");
      const { error } = await supabase.from("favorite_places").insert({
        user_id: uid,
        name: name.trim(),
        icon,
        address: selected.address,
        lat: selected.lat,
        lng: selected.lng,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Local salvo");
      setName("");
      setQuery("");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["favorite_places"] });
      qc.invalidateQueries({ queryKey: ["favorite_places_eta"] });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar o local. Verifique sua conexão e tente de novo.")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorite_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Local removido");
      qc.invalidateQueries({ queryKey: ["favorite_places"] });
      qc.invalidateQueries({ queryKey: ["favorite_places_eta"] });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover o local. Tente de novo em instantes.")),
  });

  const pickSuggestion = async (s: PlaceSuggestion) => {
    try {
      const d = await details({ data: { placeId: s.placeId } });
      setSelected(d);
      setQuery(`${s.primaryText} — ${s.secondaryText}`);
    } catch (e) {
      toast.error(toUserMessage(e, "Não foi possível carregar o endereço escolhido. Tente de novo."));
    }
  };

  const canSave = useMemo(() => !!selected && name.trim().length > 0, [selected, name]);

  return (
    <AppShell title="Locais" subtitle="Casa, trabalho, academia…">
      <section className="mt-3 space-y-3 card-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" /> Adicionar local
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="place-name">Apelido</Label>
          <Input
            id="place-name"
            placeholder="Ex.: Casa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Ícone</Label>
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border text-[11px] ${
                  icon === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="place-search">Endereço</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="place-search"
              className="pl-9"
              placeholder="Buscar endereço…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              autoComplete="off"
            />
          </div>
          {suggestions.length > 0 && !selected && (
            <ul className="overflow-hidden rounded-xl border border-border bg-popover">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{s.primaryText}</span>
                    <span className="text-xs text-muted-foreground">{s.secondaryText}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <p className="text-xs text-muted-foreground">✓ {selected.address}</p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={!canSave || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Salvando…" : "Salvar local"}
        </Button>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Meus locais
        </h2>
        {places.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhum local salvo ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {places.map((p) => {
              const Icon = iconFor(p.icon);
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() =>
                        startTrip.openFor({
                          id: p.id,
                          name: p.name,
                          icon: p.icon,
                          lat: p.lat,
                          lng: p.lng,
                          geofence_radius_m:
                            (p as { geofence_radius_m?: number }).geofence_radius_m ?? 500,
                        })
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(p.id)}
                      aria-label={`Remover ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="border-t border-border">
                    <PlaceAutomationPanel place={p} />
                  </div>
                </li>

              );
            })}
          </ul>
        )}
      </section>

      <StartTripDialog
        open={startTrip.open}
        onOpenChange={(o) => (!o ? startTrip.close() : null)}
        place={startTrip.place}
      />
    </AppShell>
  );
}
