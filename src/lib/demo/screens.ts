/**
 * Catálogo dos prints reais das telas do app (capturados na rota `/demo`).
 * Usado nas páginas de marketing e nas metatags de compartilhamento.
 */
import painel from "@/assets/screens/painel.png.asset.json";
import viagens from "@/assets/screens/viagens.png.asset.json";
import relatorio from "@/assets/screens/relatorio.png.asset.json";
import abastecer from "@/assets/screens/abastecer.png.asset.json";
import rastreio from "@/assets/screens/rastreio.png.asset.json";

export const SITE_URL = "https://telemetrix.lovable.app";

export interface ScreenShotInfo {
  id: "painel" | "viagens" | "relatorio" | "abastecer" | "rastreio";
  title: string;
  alt: string;
  /** Caminho servido pelo CDN de assets. */
  url: string;
  /** URL absoluta, para og:image / twitter:image. */
  absoluteUrl: string;
}

function make(
  id: ScreenShotInfo["id"],
  title: string,
  alt: string,
  pointer: { url: string },
): ScreenShotInfo {
  return { id, title, alt, url: pointer.url, absoluteUrl: `${SITE_URL}${pointer.url}` };
}

export const SCREENSHOTS: ScreenShotInfo[] = [
  make(
    "painel",
    "Painel ao vivo",
    "Painel do Telemetrix com mostradores neon de velocidade, giro e combustível, autonomia estimada e mapa da rota",
    painel,
  ),
  make(
    "viagens",
    "Viagens automáticas",
    "Lista de viagens do Telemetrix com distância, duração, litros e custo de cada trajeto",
    viagens,
  ),
  make(
    "relatorio",
    "Relatório semanal",
    "Relatório semanal do Telemetrix com km rodados, gasto, km por dia e Eco Score",
    relatorio,
  ),
  make(
    "abastecer",
    "Abastecimentos",
    "Tela de abastecimento do Telemetrix com litros, preço por litro, odômetro e consumo médio real",
    abastecer,
  ),
  make(
    "rastreio",
    "Rastreador",
    "Modo rastreador do Telemetrix com mapa, distância até o carro, linha do tempo e último ponto estacionado",
    rastreio,
  ),
];

export const SCREENSHOT_BY_ID = Object.fromEntries(
  SCREENSHOTS.map((s) => [s.id, s]),
) as Record<ScreenShotInfo["id"], ScreenShotInfo>;

/** Print usado como imagem de compartilhamento padrão. */
export const OG_SCREENSHOT = SCREENSHOT_BY_ID.painel;
