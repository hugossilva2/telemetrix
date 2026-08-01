import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export type ReverseGeocodeResult = {
  address: string | null;
  reason?: string;
};

/**
 * Geocodificação reversa da última posição conhecida. Usa a chave de servidor
 * do connector do Google Maps (nunca exposta ao navegador).
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { lat: number; lng: number }) => {
    const { lat, lng } = data ?? ({} as { lat: number; lng: number });
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new Error("Coordenadas inválidas");
    }
    return { lat, lng };
  })
  .handler(async ({ data }): Promise<ReverseGeocodeResult> => {
    const lovable = process.env["LOVABLE_API_KEY"];
    const gmaps = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovable || !gmaps) return { address: null, reason: "connector-missing" };

    const url = `${GATEWAY}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR&result_type=street_address|route|premise|neighborhood|locality`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": gmaps,
      },
    });

    if (res.status === 403) {
      const details: Array<{ reason?: string }> =
        (await res.json().catch(() => null))?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
        throw new Error(
          'A chave de servidor do Google Maps está restrita por referenciador. No Google Cloud Console, defina as restrições de aplicativo da chave de servidor como "Nenhuma" ou "Endereços IP".',
        );
      }
      if (reason === "API_KEY_SERVICE_BLOCKED") {
        throw new Error(
          "A chave de servidor do Google Maps não permite a Geocoding API. Adicione essa API à lista de APIs permitidas da chave.",
        );
      }
      throw new Error("A requisição ao Google Maps foi negada (403).");
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`geocode falhou [${res.status}]: ${body}`);
      throw new Error(`Geocodificação falhou [${res.status}]`);
    }

    const json = (await res.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string }>;
    };
    const address = json.results?.[0]?.formatted_address ?? null;
    return { address, reason: address ? undefined : json.status };
  });
