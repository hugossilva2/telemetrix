const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

/** Máximo aceito pela Roads API por requisição. */
const BATCH = 100;

export type SnapInput = { lat: number; lng: number };

export type SnappedPoint = {
  lat: number;
  lng: number;
  /** Índice do ponto original que originou este ponto (null = interpolado). */
  originalIndex: number | null;
};

export type SnapResult = {
  snapped: boolean;
  points: SnappedPoint[];
  /** Motivo quando `snapped` é false (uso interno/diagnóstico). */
  reason?: string;
};

type RoadsResponse = {
  snappedPoints?: Array<{
    location?: { latitude: number; longitude: number };
    originalIndex?: number;
  }>;
};

async function snapBatch(points: SnapInput[], offset: number): Promise<SnappedPoint[]> {
  const lovable = process.env["LOVABLE_API_KEY"];
  const gmaps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !gmaps) throw new Error("Google Maps connector não configurado");

  const path = points.map((p) => `${p.lat},${p.lng}`).join("|");
  const url = `${GATEWAY}/roads/v1/snapToRoads?interpolate=true&path=${encodeURIComponent(path)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": gmaps,
    },
  });

  if (res.status === 403) {
    const details: Array<{ reason?: string }> =
      ((await res.json().catch(() => ({}))) as {
        error?: { details?: Array<{ reason?: string }> };
      })?.error?.details ?? [];
    const reason = details.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
      throw new Error(
        'A chave do Google Maps está restrita por referrer. Ajuste a restrição da chave de servidor para "None" ou "IP addresses".',
      );
    }
    if (reason === "API_KEY_SERVICE_BLOCKED") {
      throw new Error(
        "A chave do Google Maps não permite a Roads API. Habilite a Roads API na lista de APIs permitidas da chave.",
      );
    }
    throw new Error("Google Maps recusou a requisição (403). Verifique as restrições da chave.");
  }

  if (!res.ok) {
    const t = await res.text();
    console.error("[snapToRoads]", res.status, t);
    throw new Error(`Falha no Snap to Roads (${res.status})`);
  }

  const json = (await res.json()) as RoadsResponse;
  return (json.snappedPoints ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      originalIndex: typeof p.originalIndex === "number" ? p.originalIndex + offset : null,
    }));
}

/**
 * Alinha coordenadas GPS à geometria real das ruas (Google Roads API).
 * Nunca lança: em caso de falha devolve `snapped: false` para o chamador
 * cair no traçado bruto.
 *
 * @param maxPoints trava de custo — cada 100 pontos = 1 requisição Google.
 */
export async function snapTrail(
  points: SnapInput[],
  maxPoints = 5000,
): Promise<SnapResult> {
  const raw = (points ?? []).filter(
    (p) =>
      typeof p?.lat === "number" &&
      typeof p?.lng === "number" &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng),
  );
  if (raw.length < 2) return { snapped: false, points: [], reason: "poucos pontos" };

  const limited = raw.length > maxPoints ? raw.slice(-maxPoints) : raw;

  try {
    const out: SnappedPoint[] = [];
    for (let i = 0; i < limited.length; i += BATCH) {
      const chunk = limited.slice(i, i + BATCH);
      if (chunk.length < 2) break;
      const snappedChunk = await snapBatch(chunk, i);
      out.push(...snappedChunk);
    }
    if (out.length < 2) return { snapped: false, points: [], reason: "sem retorno" };
    return { snapped: true, points: out };
  } catch (err) {
    console.error("[snapToRoads] fallback bruto:", err);
    return {
      snapped: false,
      points: [],
      reason: err instanceof Error ? err.message : "erro desconhecido",
    };
  }
}
