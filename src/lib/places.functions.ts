import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const gmaps = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovable || !gmaps) throw new Error("Google Maps connector não configurado");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": gmaps,
  };
}

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

export const searchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; bias?: { lat: number; lng: number } }) => input)
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const q = (data.query || "").trim();
    if (q.length < 2) return [];
    const body: Record<string, unknown> = {
      input: q,
      languageCode: "pt-BR",
      regionCode: "BR",
    };
    if (data.bias) {
      body.locationBias = {
        circle: {
          center: { latitude: data.bias.lat, longitude: data.bias.lng },
          radius: 50000,
        },
      };
    }
    const res = await fetch(`${GATEWAY}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[places autocomplete]", res.status, t);
      throw new Error(`Falha na busca (${res.status})`);
    }
    const json = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
          };
          text?: { text: string };
        };
      }>;
    };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        placeId: p.placeId,
        primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      }));
  });

export type PlaceDetails = {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
};

export const getPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { placeId: string }) => input)
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const res = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(data.placeId)}`, {
      headers: {
        ...gatewayHeaders(),
        "X-Goog-FieldMask": "id,formattedAddress,location",
      },
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[place details]", res.status, t);
      throw new Error(`Falha ao carregar local (${res.status})`);
    }
    const json = (await res.json()) as {
      id: string;
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    };
    if (!json.location) throw new Error("Local sem coordenadas");
    return {
      placeId: json.id,
      address: json.formattedAddress ?? "",
      lat: json.location.latitude,
      lng: json.location.longitude,
    };
  });

export type RouteEta = {
  durationSeconds: number;
  distanceMeters: number;
};

export const getRouteEta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
    }) => input,
  )
  .handler(async ({ data }): Promise<RouteEta> => {
    const body = {
      origin: {
        location: {
          latLng: { latitude: data.origin.lat, longitude: data.origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: data.destination.lat, longitude: data.destination.lng },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      languageCode: "pt-BR",
      regionCode: "BR",
      units: "METRIC",
    };
    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[routes]", res.status, t);
      throw new Error(`Falha ao calcular rota (${res.status})`);
    }
    const json = (await res.json()) as {
      routes?: Array<{ duration?: string; distanceMeters?: number }>;
    };
    const r = json.routes?.[0];
    if (!r) throw new Error("Rota não encontrada");
    // duration é string tipo "1234s"
    const seconds = r.duration ? parseInt(r.duration.replace(/[^0-9]/g, ""), 10) || 0 : 0;
    return {
      durationSeconds: seconds,
      distanceMeters: r.distanceMeters ?? 0,
    };
  });

export type GasStation = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Distância em linha reta (m) informada pelo ranking do Google. */
  distanceKm: number;
};

function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Postos de combustível mais próximos de uma posição. */
export const nearbyGasStations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lat: number; lng: number; limit?: number }) => input)
  .handler(async ({ data }): Promise<GasStation[]> => {
    const { lat, lng } = data;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const limit = Math.max(1, Math.min(10, data.limit ?? 3));

    const search = async (radius: number) => {
      const res = await fetch(`${GATEWAY}/places/v1/places:searchNearby`, {
        method: "POST",
        headers: {
          ...gatewayHeaders(),
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          includedTypes: ["gas_station"],
          maxResultCount: limit,
          rankPreference: "DISTANCE",
          languageCode: "pt-BR",
          regionCode: "BR",
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radius },
          },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("[gas stations]", res.status, t);
        throw new Error(`Falha ao buscar postos (${res.status})`);
      }
      const json = (await res.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
        }>;
      };
      return json.places ?? [];
    };

    let places = await search(5000);
    if (places.length === 0) places = await search(15000);

    return places
      .filter((p) => !!p.location)
      .map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "Posto",
        address: p.formattedAddress ?? "",
        lat: p.location!.latitude,
        lng: p.location!.longitude,
        distanceKm: distKm(lat, lng, p.location!.latitude, p.location!.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  });
