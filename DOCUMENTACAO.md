# Telemetrix — Documentação Técnica Completa

> PWA mobile-first de telemetria e gestão veicular em tempo real.
> Arquitetura híbrida: rastreador IoT na nuvem (Flespi/FMC003) **+** adaptador OBD-II ELM327 via Bluetooth **+** GPS do celular.

- **Projeto Lovable:** `7c374bcd-c1f1-44e3-b253-189fe82df77d`
- **Supabase ref:** `qyvlzcgvdpjjlcgllvlp`
- **Preview:** https://id-preview--7c374bcd-c1f1-44e3-b253-189fe82df77d.lovable.app
- **Produção:** https://drive-wise-69.lovable.app
- **Veículo calibrado:** Fiat Cronos Drive 1.3 (2022) — Firefly 1.3 8V, 109 cv etanol / 101 cv gasolina

---

## 1. Visão geral

O Telemetrix transforma dados brutos de telemetria (velocidade, RPM, ignição, odômetro, posição GPS) em:

1. **Viagens** com rota, duração, consumo, custo em reais e nota de direção.
2. **Eco Score (0–100)** com detecção de freada brusca, aceleração agressiva, curva acentuada, excesso de velocidade e giro alto.
3. **Rastreamento de segurança** com marcador de estacionamento, geofences, alertas de ignição/movimento e perda de sinal.
4. **Gestão do veículo**: abastecimentos, despesas, manutenção preventiva, documentos, motoristas e rotinas de conferência.
5. **Inteligência artificial**: coach por viagem e recomendações automáticas de condução baseadas no histórico.
6. **Modo Observador**: uma segunda conta (familiar) acompanha localização e viagem ao vivo, somente leitura.

Todo o app é **Dark Mode**, mobile-first, instalável (PWA) e funciona **offline-first**, sincronizando quando a rede volta.

---

## 2. Stack tecnológica

| Camada | Tecnologia |
| --- | --- |
| Framework | TanStack Start v1 (React 19 + SSR/Worker) |
| Build | Vite 8, TypeScript 5.8 |
| Roteamento | TanStack Router (file-based, `src/routes`) |
| Dados/cache | TanStack Query v5 |
| UI | Tailwind CSS v4 (tokens OKLCH) + shadcn/ui + Radix + lucide-react |
| Tipografia/tema | Space Grotesk, paleta **Neon Mint** (dark) |
| Gráficos | Recharts |
| Mapas | Leaflet + react-leaflet, múltiplos estilos de tile |
| Realtime IoT | MQTT sobre WebSocket (`mqtt` 5) contra a Flespi |
| OBD local | Web Bluetooth + protocolo ELM327 (AT/PID) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Server-side | `createServerFn` (RPC tipado) e server routes `/api/public/*` |
| IA | Lovable AI Gateway — `google/gemini-3.6-flash` |
| Push | Web Push VAPID (`@block65/webcrypto-web-push`) + Service Worker |
| Offline | IndexedDB + fila de sincronização |
| Externo | Google Routes API v2, Roads API (snap-to-roads), Geocoding |

---

## 3. Arquitetura

```text
                 ┌───────────────────────────────┐
   Fonte A ──────►  Flespi Cloud (FMC003)        │
   (rastreador)  │  MQTT/WSS + REST + Webhook    │
                 └───────────────┬───────────────┘
                                 │
   Fonte B ──────► ELM327 BLE ───┤        ┌──────────────────────┐
   (OBD local)     + GPS celular │        │  TelemetryProvider   │
                                 ├───────►│  (normaliza fontes)  │
   Fonte C ──────► Supabase live │        └──────┬───────────────┘
   (observador)    mirror        │               │
                                 │        ┌──────▼───────────────┐
                                 │        │ Hooks de domínio     │
                                 │        │ trip tracker, eco,   │
                                 │        │ safe start, geofence │
                                 │        └──────┬───────────────┘
                                 │               │
                          ┌──────▼───────────────▼──────┐
                          │  Supabase Postgres + RLS     │
                          │  trips, tracker_*, eco, docs │
                          └──────┬───────────────────────┘
                                 │
                    server fns / server routes
                    IA · push · rotas · geocoding
```

### 3.1 Fontes de telemetria (`src/lib/telemetry/`, `src/components/telemetry/TelemetryProvider.tsx`)

- **`useFlespiMqtt`** — assina o canal MQTT da Flespi por dispositivo, faz parse das chaves (`src/lib/flespi/parse.ts`) e emite amostras normalizadas.
- **`useOBD2Local`** — conecta o ELM327 por Web Bluetooth, envia comandos AT e PIDs (`src/lib/obd/pids.ts`) para ler RPM, velocidade, carga, temperatura; a posição vem do GPS do celular.
- **`useTelemetry`** — hook único consumido pela UI; o provider decide a fonte ativa (`src/lib/telemetry/source.ts`) e mantém `ignition`, `speed`, `rpm`, `odometer`, `lat/lng`, `updatedAt`.
- **`lastKnown.ts`** — no boot busca a última posição por REST na Flespi, para o mapa nunca abrir “aguardando posição”.

### 3.2 Boundaries de servidor

- `*.functions.ts` → `createServerFn` (RPC chamado pelo cliente).
- `*.server.ts` → helpers server-only (prompts de IA, envio de push, execução de webhooks).
- `src/routes/api/public/*` → HTTP cru para chamadas externas:
  - `flespi-webhook.ts` — recebe eventos do rastreador (ignição, movimento, geofence), valida `FLESPI_WEBHOOK_SECRET`, grava `tracker_events`, fecha viagens e dispara automações/push.
  - `tracker-heartbeat.ts` — batimento de presença; ausência > 10 min gera alerta de **perda de sinal**.

### 3.3 Offline-first (`src/lib/offline/`)

`db.ts` (IndexedDB) guarda viagens, eventos e checkups criados sem rede; `queue.ts` enfileira as operações; `sync.ts` + `useOfflineSync` drenam a fila ao reconectar. O card `OfflineQueueCard` mostra pendências em Ajustes.

### 3.4 PWA

`vite-plugin-pwa` + `src/pwa/register-sw.ts` (registro imediato) + `public/push-sw.js` para exibir notificações e abrir a rota certa no clique.

---

## 4. Banco de dados (Supabase / schema `public`)

Todas as tabelas têm **RLS** ativa e são escopadas por `user_id = auth.uid()`; o compartilhamento usa a função `SECURITY DEFINER` `can_view_vehicle()`.

### 4.1 Núcleo

| Tabela | Função | Campos-chave |
| --- | --- | --- |
| `vehicles` | Veículo, odômetro, alertas e pareamentos | `plate`, `current_mileage`, `avg_consumption_kmpl`, `flespi_device_id`, `tracker_mode`, `obd_device_id`, `alert_ignition`, `alert_motion_off`, `alert_geofence`, `alert_signal_lost` |
| `drivers` | Motoristas, foto e CNH | `name`, `photo_path`, `license_number`, `license_expires_on`, `is_default` |
| `trips` | Viagem consolidada | tempos, coordenadas inicial/final, `distance_km`, `avg/max_speed_kmh`, `fuel_liters`, `estimated_cost`, `eco_score`, contadores de eventos, `idle_seconds`, `wasted_fuel_liters/cost`, `eco_events` (jsonb), `route_data` (jsonb), `hardware_source` (`fmc003` \| `elm327`) |
| `device_trip_state` | Estado vivo por dispositivo (viagem aberta, geofences) | `ignition_on`, `start_*`, `last_*`, `geofence_state`, `last_message_at` |
| `tracker_pings` | Histórico de posições | `lat`, `lng`, `speed_kmh`, `ignition`, `recorded_at` |
| `tracker_events` | Timeline de segurança | `type` (`ignition_on/off`, `motion_off_ignition`, `geofence_enter/exit`, `signal_lost`), `place_id`, `metadata` |

### 4.2 Custos e manutenção

| Tabela | Função |
| --- | --- |
| `fuel_logs` | Abastecimentos com preço/litro, litros, km no tanque e recibo (bucket `fuel-receipts`) |
| `expenses` | Despesas por categoria (`pedagio`, `multa`, `seguro`, `combustivel`…), vencimento, pago, anexo |
| `maintenance_records` | Últimas trocas (`oleo`, `filtro_*`, `correia`, `pneus`, `freios`, `velas`, `revisao`) com `interval_km` / `interval_months` |
| `vehicle_documents` | CRLV, seguro, IPVA, licenciamento, inspeção — com `expires_on` e arquivo (bucket `vehicle-docs`) |
| `vehicle_checkups` | Rotinas conferidas (óleo, arrefecimento, faróis, pneus, lavagem, água do limpador) |

### 4.3 Inteligência, lugares e compartilhamento

| Tabela | Função |
| --- | --- |
| `trip_coachings` | Cache da análise de IA por viagem (`grade`, `headline`, `summary`, `tips` jsonb, `comparison`, `highlight`, `model`) |
| `safe_starts` | Registros de Partida Segura (`off_minutes`, `min_rpm`, `required`, `ready`, `ready_at`) |
| `favorite_places` | Locais salvos com raio de geofence (`geofence_radius_m`, `geofence_enabled`) |
| `place_automations` | Webhooks por entrada/saída de cerca (`url`, `method`, `body_json`, header customizado, `cooldown_seconds`) |
| `automation_runs` | Log de execuções (status HTTP, erro, manual) |
| `vehicle_shares` | Convite do observador (`invited_email`, `viewer_user_id`, `accepted_at`, `revoked_at`, `viewer_last_seen_at`) |
| `push_subscriptions` | Endpoints Web Push por dispositivo (`endpoint`, `p256dh`, `auth`) |

### 4.4 Funções e enums

- `can_view_vehicle(_vehicle_id uuid)` — permite leitura ao observador convidado (por `viewer_user_id` ou e-mail do JWT).
- `update_updated_at_column()` — trigger de `updated_at`.
- `validate_trip_hardware_source()` — garante `fmc003` ou `elm327`.
- Enums: `expense_category`, `maintenance_type`, `tracker_event_type`, `vehicle_document_type`.

### 4.5 Storage

- `fuel-receipts` (privado) — recibos de abastecimento (foto, galeria ou PDF).
- `vehicle-docs` (privado) — documentos do carro e do motorista.

### 4.6 Secrets

`FLESPI_WEBHOOK_SECRET`, `LOVABLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_BROWSER_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, além das chaves Supabase gerenciadas.

---

## 5. Rotas do aplicativo

| Rota | Tela | Observador |
| --- | --- | --- |
| `/auth` | Login/cadastro Supabase | — |
| `/` | **Dashboard**: status do motor, KPIs ao vivo, viagem em andamento, partida segura, alertas | ✅ |
| `/mapa` | Mapa completo: posição ao vivo, último estacionamento, estilos de tile, heatmap | ✅ |
| `/rastreador` | Modo Rastreador full-screen com timeline de segurança | ✅ |
| `/viagens` · `/viagens/$id` | Histórico e detalhe da viagem (rota, eventos, coach de IA) | — |
| `/eco` | Eco Score, eventos do mês, ficha técnica, **recomendações automáticas de IA** | — |
| `/relatorio` | Abas Evolução (gráficos semanais), Semanal e Mensal | — |
| `/planejar` | Rota planejada com Google Routes + alerta de desvio | — |
| `/lugares` | Locais salvos, geofences e automações (webhooks) | — |
| `/abastecimento` · `/despesas` | Lançamentos financeiros com anexos | — |
| `/manutencao` | Últimas trocas e alertas de próxima manutenção | — |
| `/documentos` · `/gestao` | Documentos e visão consolidada de gestão | — |
| `/motoristas` · `/motoristas/$id` | Perfil, pontuação e ranking de motoristas | — |
| `/rotinas` | Rotinas de conferência e saúde do veículo | — |
| `/compartilhar` | Convidar/revogar observador | — |
| `/acompanhar` | Visão do observador (tempo real, polling 5 s) | ✅ |
| `/ajustes` | Fonte de dados, Bluetooth, push, fila offline, instalar app | parcial |

---

## 6. Funcionalidades detalhadas

### 6.1 Dashboard em tempo real
`StatusHeader` mostra fonte ativa e frescor do dado. KPIs (velocidade, RPM, odômetro, consumo instantâneo) **zeram quando a ignição está OFF**. Com viagem ativa, o app entra em **Modo Viagem**: mantém mapa, dados do carro/motorista e locais salvos, ocultando cards secundários (partida segura, alertas).

### 6.2 Registro automático de viagens
`useLiveTripTracker` abre a viagem na ignição ON e a fecha na OFF com **tolerância de 3 min** (`IGNITION_OFF_GRACE_MS`) para evitar encerramento por motor morrendo. `saveTrip.ts` grava a viagem no cliente (fallback do webhook), com distância, duração, velocidade média/máxima, litros estimados, custo (`DEFAULT_GAS_PRICE_PER_LITER = 5,89`), eco score, eventos e `route_data`. `DeleteTripButton` permite excluir/desconsiderar uma viagem.

### 6.3 Mapa e rotas
- Estilos de tile alternáveis (`MapStyleControl`) e marcadores dinâmicos por estado.
- Marcador **“P”** persistente do último estacionamento (`useParkedSpot`, localStorage + evento de ignição OFF).
- `SpeedPolyline` colore a rota por velocidade; `TelemetryPolyline` desenha heatmap de aceleração.
- **Snap to Roads** (Google Roads) corrige o traçado histórico.
- Busca de destino estilo Uber (`DestinationSearch`) e `StartTripDialog`: ao “Ir para”, verifica se o carro está ligado, inicia cronômetro e monitora distância/ETA até a geofence de chegada.
- `/planejar` calcula rota com trânsito (Google Routes v2) e `useRouteDeviation` alerta desvio acima de 350 m.

### 6.4 Eco Score (0–100)
Sem acelerômetro nativo no FMC003, os eventos são derivados por software (`src/lib/eco/detect.ts`) a partir de velocidade, rumo, RPM e carga, calibrados pela ficha técnica (`referenceAccelKmhPerS`, faixa econômica de giro). Tipos: `harsh_brake`, `harsh_accel`, `harsh_corner`, `overspeed`, `high_rpm`, com severidade moderada/severa. `score.ts` penaliza eventos e marcha lenta e estima **litros e reais desperdiçados**. `LivePerformanceBadge` classifica em tempo real (ótimo/bom/regular/péssimo) contra a meta Inmetro do combustível ativo.

### 6.5 Coach de direção com IA
- **Por viagem** (`coach.functions.ts` + `TripCoachCard`): nota, manchete, resumo, 3 dicas, comparação com histórico e destaque; resultado fica em cache em `trip_coachings`.
- **Recomendações automáticas** (`habits.functions.ts` + `DrivingHabitsCard`, na página Eco): consolida as **últimas 20 viagens** — eco score médio, km/L, velocidade média/pico, marcha lenta, eventos por 100 km, tendência recente vs. anterior, viagens noturnas e curtas — e a IA devolve 4–5 recomendações priorizadas (alta/média/baixa) com impacto esperado, ponto forte e foco de melhoria.
Ambos usam o Lovable AI Gateway com `google/gemini-3.6-flash`, prompt em pt-BR e resposta JSON validada.

### 6.6 Partida Segura
Após **60 min** com o motor desligado, o app exige **30 s de RPM abaixo de 1000** antes de liberar a saída. `SafeStartCard` fica vermelho enquanto não estiver pronto e verde ao liberar; cada evento é registrado em `safe_starts`.

### 6.7 Modo Rastreador e automações
Mapa full-screen, timeline de eventos, detecção de movimento com motor desligado, geofences com histerese e alerta de perda de sinal (heartbeat 10 min). `PlaceAutomationPanel` dispara webhooks (Alexa, luzes, etc.) ao entrar/sair de um raio configurável, com cooldown e log em `automation_runs`.

### 6.8 Modo Observador
Convite por e-mail em `vehicle_shares`. O observador acessa **apenas** Dashboard e rastreamento (`useIsObserver` + `ObserverGate`), vê viagem em andamento com polling de 5 s, endereço por reverse geocoding, histórico e recebe push. `useLivePublish` espelha a telemetria local (OBD) no Supabase para o observador. O `viewer_last_seen_at` gera a tag **“acompanhando”** na conta principal.

### 6.9 Gestão, manutenção e rotinas
- Abastecimentos e despesas com anexo unificado (`FileAttachment`: câmera, galeria ou PDF).
- Manutenção: cadastro da última troca + km; o app subtrai do odômetro MQTT e alerta a **500 km** ou pelo intervalo em meses.
- Documentos: alertas de vencimento de CNH, CRLV, seguro e IPVA no Dashboard.
- Rotinas (`/rotinas`): botões de conferência com periodicidade semanal/mensal e indicador de **saúde do veículo** com pendências.

### 6.10 Relatórios
`WeeklyReport` (média de distância, velocidade, RPM e gasto) e `TrendsDashboard` (aba **Evolução**): linha de Eco Score com meta 90, barras de km/L com a meta Inmetro do combustível ativo, área de eficiência %, KPIs com delta semanal e seletor de 8/12/26 semanas.

### 6.11 Notificações push
VAPID + Service Worker próprio. `push.functions.ts` registra assinaturas; `send.server.ts` envia eventos (ignição, movimento suspeito, geofence, perda de sinal, vencimentos) com fan-out para o observador.

---

## 7. Estrutura de pastas

```text
src/
├── routes/                  # rotas file-based (+ api/public para HTTP cru)
├── components/
│   ├── dashboard/ map/ trips/ eco/ coach/ reports/
│   ├── drivers/ docs/ maintenance/ checkups/ places/ observer/
│   ├── settings/ telemetry/ layout/ common/ ui(shadcn)
├── hooks/                   # useTelemetry, useFlespiMqtt, useOBD2Local, useLiveTripTracker…
├── lib/
│   ├── telemetry/ flespi/ obd/        # fontes de dados
│   ├── trips/ eco/ drivers/ vehicles/ # domínio e calibração
│   ├── coach/                         # IA (functions + server + types)
│   ├── maps/ geo/ map/                # rotas, snap-to-roads, tiles
│   ├── offline/ push/ shares/ tracker/ automations/
│   └── docs/ expenses/ maintenance/ checkups/ reports/
├── integrations/supabase/   # client, client.server, auth-middleware, types (gerado)
└── pwa/                     # registro do service worker
supabase/migrations/         # histórico de schema
public/push-sw.js            # service worker de push
```

---

## 8. Convenções e regras de projeto

- Cores, sombras e gradientes **sempre** via tokens semânticos do design system (OKLCH) — nunca `text-white`/`bg-[#...]`.
- Toda nova lógica de servidor usa `createServerFn`; endpoints externos vão em `/api/public/*` com validação do chamador.
- `process.env` só dentro de handlers; navegador usa `import.meta.env.VITE_*`.
- Nunca editar `src/integrations/supabase/types.ts` nem `src/routeTree.gen.ts` (gerados).
- Mudanças de schema apenas por migração, com `GRANT` explícito e políticas RLS.
- Trabalho em fases incrementais: validar e pedir aprovação antes de avançar.

---

## 9. Roadmap sugerido

1. **Diagnóstico OBD (DTCs)** — leitura e limpeza de códigos de falha via ELM327.
2. **Carteira do carro** — custo por km, TCO e projeção de gastos.
3. **Alertas inteligentes** — anomalias de consumo e temperatura por aprendizado do histórico.
4. **Multi-veículo/frota** — ranking comparativo entre carros e motoristas.
5. **Preço real de combustível** — integração para substituir o valor fixo de R$ 5,89/L.

---

_Documento gerado automaticamente a partir do código-fonte do projeto Telemetrix._
