import { ACTIVE_SPEC, expectedKmpl, fuelLabel, type FuelKind } from "@/lib/vehicles/specs";
import { normalizeGrade, type CoachGrade } from "@/lib/coach/types";
import type { DrivingRecommendation, HabitsAnalysis } from "@/lib/coach/habits.types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export interface HabitsAggregate {
  trips: number;
  fromISO: string | null;
  toISO: string | null;
  totalKm: number;
  totalLiters: number;
  totalCost: number;
  avgEcoScore: number | null;
  avgKmpl: number | null;
  avgSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  idleMinutes: number;
  wastedLiters: number;
  wastedCost: number;
  eventsPer100Km: Record<string, number>;
  worstEvent: string | null;
  scoreTrend: number | null;
  nightTrips: number;
  shortTrips: number;
}

function num(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? "sem dado" : value.toFixed(digits);
}

const EVENT_PT: Record<string, string> = {
  harsh_brake: "freada brusca",
  harsh_accel: "aceleração agressiva",
  harsh_corner: "curva acentuada",
  overspeed: "excesso de velocidade",
  high_rpm: "giro alto",
};

export function buildHabitsPrompt({
  agg,
  fuel,
}: {
  agg: HabitsAggregate;
  fuel: FuelKind;
}) {
  const spec = ACTIVE_SPEC;
  const target = expectedKmpl({ fuel, avgSpeedKmh: agg.avgSpeedKmh });
  return [
    `Veículo: ${spec.name} ${spec.year} (${spec.engine}, ${spec.powerCvEthanol} cv etanol / ${spec.powerCvGasoline} cv gasolina, ${spec.gearbox}).`,
    `Combustível em uso: ${fuelLabel(fuel)}. Faixa de giro econômica: ${spec.ecoRpm.min}-${spec.ecoRpm.max} rpm.`,
    `Meta Inmetro para a velocidade média do período: ${num(target, 1)} km/l.`,
    "",
    `PADRÃO DAS ÚLTIMAS ${agg.trips} VIAGENS`,
    `- Período: ${agg.fromISO ?? "?"} até ${agg.toISO ?? "?"}`,
    `- Distância total: ${num(agg.totalKm, 1)} km | litros: ${num(agg.totalLiters, 2)} | custo: R$ ${num(agg.totalCost, 2)}`,
    `- Eco Score médio: ${num(agg.avgEcoScore, 0)}/100 (tendência recente vs. anterior: ${num(agg.scoreTrend, 1)} pontos)`,
    `- Consumo médio: ${num(agg.avgKmpl, 1)} km/l`,
    `- Velocidade média: ${num(agg.avgSpeedKmh, 0)} km/h | pico registrado: ${num(agg.maxSpeedKmh, 0)} km/h`,
    `- Marcha lenta acumulada: ${num(agg.idleMinutes, 0)} min`,
    `- Desperdício estimado: ${num(agg.wastedLiters, 2)} L (R$ ${num(agg.wastedCost, 2)})`,
    `- Eventos por 100 km: ${Object.entries(agg.eventsPer100Km)
      .map(([k, v]) => `${EVENT_PT[k] ?? k} ${v.toFixed(1)}`)
      .join(", ")}`,
    `- Evento mais frequente: ${agg.worstEvent ? (EVENT_PT[agg.worstEvent] ?? agg.worstEvent) : "nenhum"}`,
    `- Viagens noturnas (após 20h): ${agg.nightTrips} | viagens curtas (<5 km): ${agg.shortTrips}`,
  ].join("\n");
}

const SYSTEM = [
  "Você é um coach de direção brasileiro, direto e prático, especialista em condução econômica e segura.",
  "Você recebe o padrão consolidado das últimas viagens de um motorista e a ficha técnica do carro.",
  "Gere recomendações automáticas de condução personalizadas para esses padrões, em português do Brasil, tom de parceiro (você).",
  "Nunca invente dados que não foram informados.",
  "Responda SOMENTE com JSON válido no formato:",
  '{"grade":"otimo|bom|regular|pessimo","headline":"frase curta até 60 caracteres","summary":"2 a 4 frases sobre o padrão de condução","recommendations":[{"title":"recomendação curta","detail":"como executar em 1 ou 2 frases","impact":"ganho esperado em 1 frase curta","priority":"alta|media|baixa"}],"strength":"1 frase com o melhor hábito atual","focus":"1 frase com o hábito que mais custa dinheiro ou segurança","savingsEstimate":"1 frase com economia mensal estimada em reais, ou null"}',
  "Devolva de 4 a 5 recomendações ordenadas da mais para a menos prioritária.",
].join(" ");

function priority(value: unknown): DrivingRecommendation["priority"] {
  const v = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (v.startsWith("alt")) return "alta";
  if (v.startsWith("baix")) return "baixa";
  return "media";
}

function parseRecommendations(value: unknown): DrivingRecommendation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const title = typeof rec["title"] === "string" ? rec["title"].trim() : "";
      if (!title) return null;
      return {
        title,
        detail: typeof rec["detail"] === "string" ? rec["detail"].trim() : "",
        impact: typeof rec["impact"] === "string" && rec["impact"].trim() ? rec["impact"].trim() : null,
        priority: priority(rec["priority"]),
      } satisfies DrivingRecommendation;
    })
    .filter((r): r is DrivingRecommendation => r != null)
    .slice(0, 6);
}

export async function requestHabits({
  prompt,
  apiKey,
  agg,
}: {
  prompt: string;
  apiKey: string;
  agg: HabitsAggregate;
}): Promise<HabitsAnalysis> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429)
    throw new Error("Muitas análises seguidas. Aguarde um instante e tente de novo.");
  if (res.status === 402)
    throw new Error("Créditos de IA esgotados. Adicione créditos no workspace para continuar.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`[habits] gateway ${res.status}: ${body}`);
    throw new Error(`Falha na análise da IA (${res.status}).`);
  }

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
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

  const grade: CoachGrade = normalizeGrade(parsed["grade"]);

  return {
    grade,
    headline: str("headline") ?? "Recomendações de condução",
    summary: str("summary") ?? "Não foi possível resumir seus padrões de condução.",
    recommendations: parseRecommendations(parsed["recommendations"]),
    strength: str("strength"),
    focus: str("focus"),
    savingsEstimate: str("savingsEstimate"),
    stats: {
      trips: agg.trips,
      totalKm: agg.totalKm,
      avgEcoScore: agg.avgEcoScore,
      avgKmpl: agg.avgKmpl,
      idleMinutes: agg.idleMinutes,
      wastedCost: agg.wastedCost,
      worstEvent: agg.worstEvent,
    },
    model: MODEL,
    createdAt: new Date().toISOString(),
  };
}
