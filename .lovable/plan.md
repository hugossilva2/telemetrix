## Objetivo

Evoluir a tela de Mapa com destino estilo Uber, corrigir o traçado do histórico com Snap to Roads e guardar a rota completa (coordenadas + telemetria) em uma única coluna `route_data` na tabela `trips`.

Provedor: **Google Maps** (conector já ativo — busca de endereços, Routes API e Roads API pelo mesmo gateway). Mapbox fica de fora para não violar os termos do Google.

## 1. Roteirização no /mapa ("Para onde vamos?")

- Barra de busca flutuante sobre o mapa (autocomplete com debounce), reaproveitando o `searchPlaces` já existente com bias na posição atual do carro.
- Ao escolher o destino: chamada à Routes API (função `planRoute` existente, com `TRAFFIC_AWARE`) partindo da posição atual do veículo/celular.
- No mapa: linha da rota planejada em **azul claro pontilhado** (camada abaixo do traçado real), marcador de destino, e um painel inferior com **ETA, horário de chegada e distância**.
- Ações no painel: "Iniciar viagem" (grava o destino ativo já usado pelo `OngoingTripCard` e ativa o monitoramento de desvio) e "Cancelar rota".
- Rotas com paradas continuam em `/planejar`, que passa a reaproveitar os mesmos componentes de busca/painel.

## 2. Map Matching (traçado grudado na rua)

- Ao **encerrar a viagem**, os pontos GPS acumulados (FMC003 ou ELM327) são enviados em lotes de 100 à Roads API (`snapToRoads`, com interpolação) através do gateway.
- Os pontos snappados voltam com o índice do ponto original, então cada coordenada corrigida herda a telemetria (velocidade, RPM, aceleração) do ponto de origem.
- Falha de rede/API não bloqueia nada: cai para os pontos brutos e a viagem é salva igual (inclusive no modo offline, que continua enfileirando).
- Durante a viagem o desenho segue leve (pontos brutos) — a correção acontece uma vez, no fim.

## 3. Heatmap de telemetria

- O traçado real continua sendo polyline multicolorida, agora sobre os pontos snappados.
- A cor deixa de ser só velocidade e passa a refletir **intensidade de aceleração/frenagem** calculada entre pontos: verde (normal), amarelo (aceleração/frenagem moderada), vermelho (evento agressivo — reaproveitando os eventos eco já detectados).
- Legenda compacta no canto do mapa. Mesmo componente usado no mapa ao vivo e no detalhe da viagem.

## 4. Persistência (Supabase)

Migração adicionando uma coluna à tabela `trips` (sem tabela nova de coordenadas):

- `route_data` (JSONB, opcional) com o formato:
  - `version`, `snapped` (booleano indicando se a Roads API respondeu), `source` (`fmc003`/`elm327`)
  - `points`: array compacto `[lat, lng, t, speed, rpm, accel]` para leitura rápida
  - `events`: eventos eco com posição
- Índice GIN não é necessário; leitura é sempre por `id` da viagem.
- O detalhe da viagem (`/viagens/$id`) passa a ler `route_data` quando existir, em vez de reconstruir o trajeto ponto a ponto.

## Detalhes técnicos

- `src/lib/maps/snapToRoads.functions.ts`: server fn autenticada, lotes de 100 pontos, `roads/v1/snapToRoads` via gateway, tratamento explícito de 403 (chave restrita) e retorno com fallback tipado.
- `src/lib/trips/routeData.ts`: montagem/parse do JSON compacto e cálculo do índice de aceleração por segmento.
- `src/components/map/DestinationSearch.tsx` e `RoutePanel.tsx`: busca + painel de ETA; `PlannedRouteLayer.tsx` para a linha pontilhada.
- `SpeedPolyline.tsx` evolui para `TelemetryPolyline` (cor por aceleração, mantendo compatibilidade com velocidade).
- `saveTrip.ts` chama o snap antes do insert e grava `route_data`; a fila offline guarda o payload já pronto e sincroniza depois.
- Sem alteração no fluxo de ignição/encerramento de viagem (tolerância de 1 minuto permanece).
