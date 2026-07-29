import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { searchPlaces, getPlaceDetails, type PlaceSuggestion } from "@/lib/places.functions";

export interface DestinationPick {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  bias?: { lat: number; lng: number } | null;
  onPick: (dest: DestinationPick) => void;
  placeholder?: string;
}

/** Busca de endereço estilo Uber ("Para onde vamos?"). */
export function DestinationSearch({ bias, onPick, placeholder = "Para onde vamos?" }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setItems([]);
      return;
    }
    const id = ++reqRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlaces({
          data: { query: q, bias: bias ? { lat: bias.lat, lng: bias.lng } : undefined },
        });
        if (reqRef.current === id) setItems(res);
      } catch {
        if (reqRef.current === id) setItems([]);
      } finally {
        if (reqRef.current === id) setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, bias?.lat, bias?.lng]);

  const handlePick = async (s: PlaceSuggestion) => {
    setPicking(s.placeId);
    try {
      const details = await getPlaceDetails({ data: { placeId: s.placeId } });
      onPick({
        placeId: details.placeId,
        name: s.primaryText,
        address: details.address || s.secondaryText,
        lat: details.lat,
        lng: details.lng,
      });
      setQuery("");
      setItems([]);
      setOpen(false);
    } finally {
      setPicking(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {!loading && query && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setQuery("");
              setItems([]);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-auto rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur">
          {items.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handlePick(s)}
                disabled={picking === s.placeId}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 disabled:opacity-60"
              >
                {picking === s.placeId ? (
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.primaryText}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.secondaryText}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
