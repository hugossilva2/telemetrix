## Incrementar visão do mapa (Leaflet + OSM)

Melhorias aplicadas em `/mapa` (tempo real) e `/viagens/$id` (histórico), mantendo o custo zero e sem tokens externos.

### 1. Seletor de estilo de mapa (base layer)

Novo controle flutuante no canto superior direito com 4 opções:

- **Escuro** — CartoDB Dark Matter (padrão, combina com o dark mode)
- **Claro** — CartoDB Positron
- **Ruas** — OpenStreetMap padrão
- **Satélite** — Esri World Imagery + overlay de labels

A escolha fica salva em `localStorage` (`mapStyle:v1`) e vale para os dois mapas.

### 2. Marcadores ricos e POIs da jornada

No `/mapa`:
- 🚗 veículo (já existe, mantém animação de pulso conforme movimento)
- 🟢 partida da rota atual (já existe)
- 🅿️ último estacionado (já existe)
- ⚡ **ponto de velocidade máxima** da rota atual (badge com km/h)
- 🛑 **paradas detectadas** — pontos onde o carro ficou >2 min parado com ignição ligada (marcador cinza com duração no popup)
- ⛽ **últimos abastecimentos** (opcional, toggle) — carrega os 5 mais recentes com localização, se houver

No `/viagens/$id`:
- 🟢 início / 🔴 fim (já existem)
- ⚡ ponto de velocidade máxima
- 🛑 paradas detectadas ao longo da viagem
- Popup em cada marcador com horário, velocidade e odômetro naquele instante

### 3. Rastro colorido por velocidade

Substitui a Polyline verde única por segmentos coloridos conforme a velocidade instantânea:

```text
0–20 km/h   →  azul     (#3b82f6)
20–40 km/h  →  verde    (#22c55e)
40–60 km/h  →  amarelo  (#eab308)
60–80 km/h  →  laranja  (#f97316)
80+ km/h    →  vermelho (#ef4444)
```

Legenda discreta no canto inferior esquerdo (chip com gradiente + rótulos). No `/mapa` usa os pontos acumulados em memória; no histórico, reconstrói a partir dos pontos salvos da viagem (quando existirem) ou desenha a linha reta início→fim atual como fallback.

### 4. Camadas e controles extras

- **Botão recentrar** (📍) — volta o mapa ao veículo/rota atual.
- **Botão fullscreen** (⛶) — expande o mapa usando a Fullscreen API do browser.
- **Toggle "Seguir veículo"** — liga/desliga o auto-recentrar no `/mapa` (hoje é sempre on).
- **Régua de escala** (`L.control.scale`) no canto inferior.
- **Minimapa** no canto — visão geral com um retângulo indicando a área atual (usa `leaflet-minimap` via CDN, ou implementação leve própria se preferir zero dependências).

### 5. Detalhes técnicos

- Novo componente `src/components/map/MapStyleControl.tsx` — dropdown com as 4 bases, persiste em `localStorage`.
- Novo componente `src/components/map/SpeedPolyline.tsx` — recebe `points: {lat,lng,speed}[]` e renderiza uma sequência de `<Polyline>` coloridas por faixa.
- Novo hook `src/hooks/useDetectedStops.ts` — dado um array de pontos com timestamp, retorna clusters onde o veículo ficou parado > 2min.
- `VehicleMap.tsx` e `TripMap.tsx` recebem `mapStyle` via prop (com fallback ao localStorage) e passam a incluir os novos marcadores/controles.
- `mapa.tsx` passa a acumular `{lat,lng,speed,t}` (hoje só guarda `[lat,lng]`) para alimentar o rastro colorido e detecção de paradas — mudança isolada no estado local, não altera schema nem webhook.
- Sem migrations. Sem dependências novas obrigatórias (minimapa é opcional; se optar por ele, adiciono `leaflet-minimap`).
- Estilo mantém o padrão atual (pílulas escuras translúcidas, cores emerald/rose, `tabular-nums`).

### Fora de escopo (posso fazer depois)

- Reconstruir rastro histórico completo (precisaria salvar pontos intermediários no Supabase — hoje só temos início/fim).
- Geofences (áreas de alerta ao entrar/sair).
- Heatmap mensal de todas as rotas.
- Medição de distância manual clicando no mapa.

Posso implementar?