## Objetivo

Modernizar o visual de todo o app Telemetrix: cards bem definidos, botões organizados e hierarquia de leitura clara — sem mudar nenhuma regra de negócio, cálculo ou consulta ao banco.

## Direção visual escolhida

- **Paleta Neon Mint (dark)**: fundo `#0d1b2a`, superfícies `#132538`/`#1b4332`, primária `#2dd4a8`, destaque `#73ffb8`
- **Tipografia**: Space Grotesk (títulos, números/KPIs) + DM Sans (texto)
- **Layout**: bento grid — KPIs em blocos de tamanhos variados, seções com cards definidos

## Etapas

### 1. Fundação de tokens (`src/styles.css`)
- Reescrever `:root`/`.dark` com a paleta em oklch: background, card, muted, border, primary, accent, ring, chart-1..5 alinhados ao mint/teal
- Novos tokens: `--surface-raised`, `--gradient-primary`, `--shadow-card`, `--shadow-glow`, `--ring-glow`
- Registrar `--font-display: "Space Grotesk"` e `--font-sans: "DM Sans"` em `@theme`
- Aumentar `--radius` para 0.875rem (cards mais definidos)
- App passa a rodar sempre em dark (classe `dark` na raiz)

### 2. Fontes (`src/routes/__root.tsx`)
- Adicionar `<link>` de preconnect + Google Fonts para Space Grotesk e DM Sans no `head()` (nunca `@import` de URL no CSS)

### 3. Primitivas de UI reutilizáveis
- `src/components/ui/section-card.tsx`: card padrão com título, ícone, ação no canto e conteúdo — substitui as dezenas de `div.rounded-2xl.border.bg-card.p-4` espalhadas
- `src/components/ui/stat-tile.tsx`: bloco de KPI (label, valor tabular, unidade, delta) para o bento
- `src/components/ui/bento.tsx`: grade `grid-cols-2` com spans (`col-span-2`) para itens grandes
- `src/components/ui/button.tsx`: revisar variantes (adicionar `glow` e ajustar alturas/raio); botões de ação passam a viver em barras de ação consistentes

### 4. Shell e navegação
- `AppShell`: header com gradiente sutil, título em Space Grotesk, slot de ação padronizado, respiro maior
- `BottomNav`: 6 itens com pílula ativa em mint, ícone com glow no item ativo, melhor contraste

### 5. Aplicar nas rotas (todo o app)
Passar por cada rota trocando os cards ad-hoc por `SectionCard`/`StatTile`/`Bento` e agrupando botões:
- Painel (`index`), Rastreador, Viagens (+detalhe), Abastecimento, Gestão, Ajustes
- Motoristas (+perfil), Eco, Despesas, Relatório, Manutenção, Documentos, Lugares, Planejar, Mapa
- Componentes de apoio: StatusHeader, TelemetryCard, LiveConsumptionCard, SafeStartCard, DriverHighlightCard, DriverScoreCard, DriverRanking, OngoingTripCard, MaintenanceAlertsCard, ExpiringDocsCard, EcoScoreRing/EcoEventsChart

### 6. Formulários
- Inputs/labels com altura e espaçamento uniformes (mantendo `h-11` mobile), agrupamento em grid de 2 colunas onde couber, botão primário sempre full-width no rodapé do card

### 7. Mapa
- Ajustar cores dos controles, polilinhas e marcadores para a nova paleta; manter as regras de z-index do Leaflet

## Detalhes técnicos

- Tailwind v4: tudo via `@theme inline` em `src/styles.css`, sem `tailwind.config.js`
- Zero cores hardcoded (`text-white`, `bg-[#...]`) — apenas tokens semânticos
- Regra de layout responsivo mantida: `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0` em linhas com texto e widgets
- Nenhuma alteração em hooks, `lib/`, server functions, migrações ou RLS

## Entrega incremental

Sugiro validar em dois passos: primeiro etapas 1–4 (tokens, fontes, primitivas, shell) para você aprovar a cara nova no Painel; depois a etapa 5 nas demais rotas.
