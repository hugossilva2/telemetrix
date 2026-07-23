## Histórico de Viagens

Detectar automaticamente cada viagem (ignição ON → OFF) e gerar um relatório com duração, distância, velocidade média, combustível estimado e custo em R$.

### Fluxo de detecção (client-side, no hook MQTT)
- Ignição passa de OFF → ON: abre uma viagem em memória, grava `start_time`, `start_lat/lng`, `mileage_at_start`.
- Enquanto ON: acumula amostras de velocidade (para média) e guarda a última posição/odômetro.
- Ignição passa de ON → OFF: fecha a viagem — calcula `distance_km` (odômetro final − inicial, fallback = Haversine start↔end), `duration`, `avg_speed`, e faz **INSERT** em `public.trips`.
- Persistência da viagem "em aberto" em `localStorage` para sobreviver a reloads da aba.

### Cálculo de combustível e custo
- Consumo médio (km/l) configurável em Ajustes (default 10 km/l).
- Último `price_per_liter` de `fuel_logs` (o mais recente do usuário) é usado como preço de referência.
- `liters = distance_km / km_por_litro`; `cost = liters × price_per_liter`.
- Ambos exibidos como estimativa quando faltar dado (sem preço ou consumo).

### Mudanças no banco (uma migration)
- `trips`: adicionar `avg_speed_kmh numeric`, `max_speed_kmh numeric`, `mileage_at_start numeric`, `mileage_at_end numeric`, `fuel_liters numeric`, `estimated_cost numeric`.
- `vehicles`: adicionar `avg_consumption_kmpl numeric not null default 10`.

### UI
- **Nova rota** `/viagens` (`src/routes/_authenticated/viagens.tsx`) listando viagens do usuário, ordem decrescente:
  - Card por viagem: data, horário início→fim, duração, distância, velocidade média, combustível (L), custo estimado (R$).
  - Tap no card → detalhe com mini-mapa (Leaflet) mostrando marcadores de início e fim.
- **BottomNav**: adicionar item "Viagens" (ícone `RouteIcon`). Reordenar para 5 abas: Painel · Mapa · **Viagens** · Abastecer · Ajustes.
- **Ajustes**: novo campo "Consumo médio (km/l)".
- **Painel**: banner discreto "Viagem em andamento" enquanto ignição=ON, mostrando duração e distância parciais.

### Escopo desta fase
Só o histórico de viagens (detecção + persistência + listagem + detalhe + campo de consumo). Sem edição manual, sem exportar CSV, sem gráficos agregados — posso adicionar depois se quiser.

### Detalhes técnicos
- Detecção da transição fica no `useFlespiMqtt` (ou hook derivado `useTripRecorder`) usando `useRef` para o estado da viagem aberta.
- INSERT via `supabase` client no browser (RLS já filtra por `auth.uid()`).
- Distância robusta: prefere delta de odômetro; se ausente ou 0, cai no Haversine da coordenada final vs inicial.
- Velocidade média: soma amostras válidas (velocidade > 0) dividido pelo número, ou `distance_km / duration_h` — uso o segundo (mais estável).
- Não vou tocar em lógica não relacionada.
