import { DEFAULT_SPEC, expectedKmpl, fuelLabel, type FuelKind } from "@/lib/vehicles/specs";
import { normalizeGrade, parseTips, type CoachGrade, type CoachTip } from "@/lib/coach/types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export interface CoachTripInput {
  distanceKm: number | null;
  durationMin: number | null;
  avgSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  fuelLiters: number | null;
  estimatedCost: number | null;
  ecoScore: number | null;
  idleSeconds: number | null;
  wastedFuelLiters: number | null;
  wastedCost: number | null;
  counts: {
    harsh_brake: number;
    harsh_accel: number;
    harsh_corner: number;
    overspeed: number;
    high_rpm: number;
  };
}

export interface CoachHistoryInput {
  trips: number;
  avgEcoScore: number | null;
  avgKmpl: number | null;
  avgEventsPer100Km: number | null;
}

export interface CoachResult {
  grade: CoachGrade;
  headline: string;
  summary: string;
  tips: CoachTip[];
  comparison: string | null;
  highlight: string | null;
  model: string;
}

function num(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? "sem dado" : value.toFixed(digits);
}

export function buildCoachPrompt({
  trip,
  history,
  fuel,
}: {
  trip: CoachTripInput;
  history: CoachHistoryInput;
  fuel: FuelKind;
}) {
  const spec = DEFAULT_SPEC;
  const target = expectedKmpl({ fuel, avgSpeedKmh: trip.avgSpeedKmh });
  const kmpl =
    trip.distanceKm && trip.fuelLiters && trip.fuelLiters > 0
      ? trip.distanceKm / trip.fuelLiters
      : null;

  return [
    `Veículo: ${spec.name} ${spec.year} (${spec.engine}, ${spec.powerCvEthanol} cv etanol / ${spec.powerCvGasoline} cv gasolina, ${spec.gearbox}).`,
    `Combustível em uso: ${fuelLabel(fuel)}. Faixa de giro econômica: ${spec.ecoRpm.min}-${spec.ecoRpm.max} rpm. 0-100 km/h de fábrica: ${spec.zeroTo100S} s.`,
    `Meta Inmetro de consumo para a velocidade média desta viagem: ${num(target, 1)} km/l.`,
    "",
    "VIAGEM ANALISADA",
    `- Distância: ${num(trip.distanceKm, 1)} km`,
    `- Duração: ${num(trip.durationMin, 0)} min`,
    `- Velocidade média: ${num(trip.avgSpeedKmh, 0)} km/h | máxima: ${num(trip.maxSpeedKmh, 0)} km/h`,
    `- Consumo medido: ${num(kmpl, 1)} km/l | litros: ${num(trip.fuelLiters, 2)} | custo: R$ ${num(trip.estimatedCost, 2)}`,
    `- Eco Score: ${trip.ecoScore ?? "sem dado"}/100`,
    `- Marcha lenta: ${num((trip.idleSeconds ?? 0) / 60, 1)} min`,
    `- Desperdício estimado: ${num(trip.wastedFuelLiters, 2)} L (R$ ${num(trip.wastedCost, 2)})`,
    `- Eventos: freada brusca ${trip.counts.harsh_brake}, aceleração agressiva ${trip.counts.harsh_accel}, curva acentuada ${trip.counts.harsh_corner}, excesso de velocidade ${trip.counts.overspeed}, giro alto ${trip.counts.high_rpm}`,
    "",
    "HISTÓRICO RECENTE DO MOTORISTA",
    `- Viagens comparadas: ${history.trips}`,
    `- Eco Score médio: ${num(history.avgEcoScore, 0)}`,
    `- Consumo médio: ${num(history.avgKmpl, 1)} km/l`,
    `- Eventos por 100 km: ${num(history.avgEventsPer100Km, 1)}`,
  ].join("\n");
}

const SYSTEM = [
  "Você é um coach de direção brasileiro, direto e prático, especialista em condução econômica e segura.",
  "Analise a viagem com base nos dados reais e na ficha técnica do carro informada.",
  "Fale em português do Brasil, tom de parceiro (você), sem jargão técnico desnecessário e sem inventar dados que não foram informados.",
  "Responda SOMENTE com um JSON válido no formato:",
  '{"grade":"otimo|bom|regular|pessimo","headline":"frase curta de até 60 caracteres","summary":"2 a 3 frases sobre a viagem","tips":[{"title":"dica curta","detail":"como executar em 1 frase"}],"comparison":"1 frase comparando com o histórico e com a meta Inmetro","highlight":"1 frase com o ponto mais positivo ou o alerta mais urgente"}',
  "Sempre devolva exatamente 3 dicas em tips, personalizadas para os eventos e o consumo desta viagem.",
].join(" ");

export async function requestCoaching({
  prompt,
  apiKey,
}: {
  prompt: string;
  apiKey: string;
}): Promise<CoachResult> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns minutos.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace para continuar.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`[coach] gateway ${res.status}: ${body}`);
    throw new Error(`Falha na análise da IA (${res.status}).`);
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("A IA respondeu em formato inesperado. Tente novamente.");
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  }

  const str = (key: string) => {
    const v = parsed[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  return {
    grade: normalizeGrade(parsed["grade"]),
    headline: str("headline") ?? "Análise da viagem",
    summary: str("summary") ?? "Não foi possível resumir esta viagem.",
    tips: parseTips(parsed["tips"]),
    comparison: str("comparison"),
    highlight: str("highlight"),
    model: MODEL,
  };
}
