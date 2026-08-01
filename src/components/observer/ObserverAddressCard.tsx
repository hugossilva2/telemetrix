import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Navigation, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reverseGeocode } from "@/lib/geo/reverse.functions";

/** Endereço aproximado da última posição + atalhos de abrir/compartilhar. */
export function ObserverAddressCard({
  lat,
  lng,
  vehicleName,
}: {
  lat: number | null;
  lng: number | null;
  vehicleName?: string | null;
}) {
  const geocode = useServerFn(reverseGeocode);

  // Arredonda para ~11 m: evita refazer a chamada a cada ping.
  const key =
    lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : null;

  const { data, isLoading } = useQuery({
    queryKey: ["observer-address", key],
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => geocode({ data: { lat: lat!, lng: lng! } }),
  });

  if (lat == null || lng == null) return null;

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const address = data?.address ?? null;

  async function share() {
    const text = `${vehicleName ?? "Veículo"} está em ${address ?? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Localização do veículo", text, url: mapsUrl });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${mapsUrl}`);
      toast.success("Localização copiada.");
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <MapPin className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-semibold tracking-tight">
            Onde o veículo está
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {isLoading
              ? "Buscando endereço…"
              : (address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={mapsUrl} target="_blank" rel="noreferrer">
            <Navigation className="size-3.5" /> Abrir no Maps
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={share}>
          <Share2 className="size-3.5" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}
