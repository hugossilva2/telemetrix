import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export type PlanPoint = { lat: number; lng: number };

export type PlannedLeg = {
  distanceMeters: number;
  durationSeconds: number;
};

export type PlannedRoute = {
  distanceMeters: number;
  durationSeconds: number;
  /** Polyline codificada (Google encoded polyline algorithm) */
  encodedPolyline: string;
  legs: PlannedLeg[];
};

export const planRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      origin: PlanPoint;
      destination: PlanPoint;
      stops?: PlanPoint[];
    }) => input,
  )
  .handler(async ({ data }): Promise<PlannedRoute> => {
    const lovable = process.env.LOVABLE_API_KEY;
    const gmaps = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovable || !gmaps) throw new Error("Google Maps connector não configurado");

    const toWaypoint = (p: PlanPoint) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    });

    const body = {
      origin: toWaypoint(data.origin),
      destination: toWaypoint(data.destination),
      intermediates: (data.stops ?? []).slice(0, 10).map(toWaypoint),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      polylineQuality: "OVERVIEW",
      languageCode: "pt-BR",
      regionCode: "BR",
      units: "METRIC",
    };

    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": gmaps,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 403) {
      const details: Array<{ reason?: string }> =
        ((await res.json()) as { error?: { details?: Array<{ reason?: string }> } })?.error
          ?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
        throw new Error(
          "A chave do Google Maps está restrita por referrer. Ajuste a restrição da chave de servidor para \"None\" ou \"IP addresses\".",
        );
      }
      if (reason === "API_KEY_SERVICE_BLOCKED") {
        throw new Error(
          "A chave do Google Maps não permite a Routes API. Habilite essa API na lista de APIs permitidas da chave.",
        );
      }
      throw new Error("Google Maps recusou a requisição (403). Verifique as restrições da chave.");
    }

    if (!res.ok) {
      const t = await res.text();
      console.error("[planRoute]", res.status, t);
      throw new Error(`Falha ao calcular rota (${res.status})`);
    }

    const json = (await res.json()) as {
      routes?: Array<{
        duration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
        legs?: Array<{ duration?: string; distanceMeters?: number }>;
      }>;
    };
    const r = json.routes?.[0];
    if (!r) throw new Error("Rota não encontrada");

    const secs = (v?: string) => (v ? parseInt(v.replace(/[^0-9]/g, ""), 10) || 0 : 0);

    return {
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds: secs(r.duration),
      encodedPolyline: r.polyline?.encodedPolyline ?? "",
      legs: (r.legs ?? []).map((l) => ({
        distanceMeters: l.distanceMeters ?? 0,
        durationSeconds: secs(l.duration),
      })),
    };
  });
