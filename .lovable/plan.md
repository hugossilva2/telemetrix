## Modo Rastreador (foco em segurança)

Nova rota `/rastreador` dedicada a rastreio de moto/veículo, com alertas de segurança e push notifications. O painel completo atual continua intacto.

### 1. Banco de dados

Nova tabela `tracker_events` para o histórico de eventos de segurança (ligou, desligou, movimento suspeito, saída de cerca, perda de sinal):
- `type` (enum: `ignition_on`, `ignition_off`, `motion_off_ignition`, `geofence_exit`, `signal_lost`)
- `lat`, `lng`, `occurred_at`, `place_id` (fk opcional para `favorite_places`)

Tabela `tracker_pings` para o "histórico automático" de posições (amostragem esparsa, ~1 por minuto quando em movimento):
- `lat`, `lng`, `speed_kmh`, `ignition`, `recorded_at`

Extensão em `favorite_places`:
- `geofence_radius_m` (int, default 150) — raio da cerca ao redor do ponto
- `geofence_enabled` (bool, default false)

Extensão em `vehicles`:
- `tracker_mode` (bool, default false) — marca o veículo como "modo rastreador"
- `push_subscription` (jsonb) — endpoint Web Push do dispositivo do dono

Nova tabela `push_subscriptions` (multi-device por usuário):
- `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`

Todas com RLS `auth.uid() = user_id` e GRANTs.

### 2. Backend / webhook

`src/routes/api/public/flespi-webhook.ts` ganha lógica de detecção e enfileira eventos:

```text
para cada mensagem:
  gravar tracker_ping (amostrado: 1 a cada 60s ou se mudou >100m)
  se ignition mudou true→false: registrar ignition_off + atualizar last_parking
  se ignition mudou false→true: registrar ignition_on
  se ignition=false E speed>3km/h ou moveu >50m: registrar motion_off_ignition
  para cada favorite_place com geofence_enabled: se estava dentro e saiu → geofence_exit
  disparar Web Push para cada push_subscription do dono
```

Cron leve (server route `/api/public/tracker-heartbeat` chamada por pg_cron a cada 5min):
- Se última mensagem > 15min → registrar `signal_lost` + push (só uma vez até voltar).

### 3. Push notifications (Web Push VAPID)

- Gerar par VAPID → guardar como secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`.
- `public/sw-push.js`: service worker dedicado só a push (separado do PWA app-shell, conforme regra da knowledge).
- Server fn `subscribeToPush` grava a inscrição na tabela.
- No webhook, ao criar evento, usar `web-push` (compatível com Cloudflare Workers via `@block65/webcrypto-web-push`) para disparar.

### 4. UI — Rota `/rastreador`

Estrutura mobile-first, mapa em tela cheia como no Waze/Uber:

```text
┌─────────────────────────────────┐
│ [Status] MOTO ligada · 14:32    │  header sticky, badge verde/cinza
├─────────────────────────────────┤
│                                 │
│         MAPA GRANDE             │  70% da tela
│      (posição atual + P         │
│       último estacionado)       │
│                                 │
├─────────────────────────────────┤
│ [🔔 3 eventos hoje]  [+ ponto]  │  ações rápidas
├─────────────────────────────────┤
│ Últimos eventos                 │
│ 🟢 Ligou · 14:32 · Casa         │
│ 🔴 Desligou · 12:10 · Trabalho  │
│ ⚠️ Saiu da cerca "Casa" · 08:15 │
└─────────────────────────────────┘
```

Componentes novos:
- `TrackerMap.tsx` — mapa cheio com posição atual, último estacionado, cercas desenhadas (círculos), pontos salvos.
- `TrackerEventList.tsx` — timeline de `tracker_events`, agrupada por dia.
- `SavePointButton.tsx` — botão flutuante "Salvar posição atual" que abre modal (nome + ícone).
- `GeofenceEditor.tsx` — em `/lugares`, slider de raio (50m–1000m) + toggle para ligar geofence por ponto.
- `PushPermissionBanner.tsx` — pede permissão + registra subscription na primeira visita à rota.

### 5. Ajustes

Nova seção "Modo Rastreador":
- Toggle "Ativar modo rastreador neste veículo"
- Lista de alertas (Ignition, Movimento suspeito, Geofence, Perda de sinal) com toggle cada
- Botão "Testar push" (dispara push de teste)
- Lista de dispositivos inscritos com opção de remover

### 6. Navegação

Substituir o ícone menos usado da BottomNav pela rota `/rastreador` **quando** o veículo ativo estiver em `tracker_mode`; senão manter como está. Alternativa mais simples: sempre adicionar como 6º item (já são 6 hoje). Vou seguir por: adicionar como 6º e destacar visualmente quando há eventos novos.

### Ordem de entrega (fases pequenas, cada uma testável)

1. **Migração DB** — tabelas + colunas + RLS + GRANTs. Você aprova a SQL antes de rodar.
2. **Rota `/rastreador` estática** — mapa grande + lista de eventos lendo da tabela (ainda vazia). Botão "salvar ponto".
3. **Detecção de eventos no webhook** — ignition on/off + motion_off_ignition + gravação de pings, sem push ainda. Testamos com uma viagem real.
4. **Geofence** — editor em `/lugares` + detecção no webhook.
5. **Heartbeat de sinal perdido** — server route + agendamento.
6. **Web Push** — VAPID, service worker de push, inscrição, envio pelo webhook. Fase final porque exige aprovação de permissão no seu celular.
7. **Ajustes + polish** — toggles por alerta, teste de push, badge de eventos novos na BottomNav.

Paro em cada fase pra você validar antes de seguir.

### Detalhes técnicos

- Web Push do lado servidor no Cloudflare Worker: usar `@block65/webcrypto-web-push` (compatível com workerd). Evitar `web-push` clássico que depende de `node:crypto` de forma incompatível.
- Amostragem de pings: gravar só se `now - last_ping > 60s` OU `haversine > 100m` OU `ignition mudou`. Evita inflar a tabela.
- Detecção de "motion_off_ignition": exige duas leituras consecutivas com deslocamento real, pra descartar jitter de GPS parado.
- Geofence: cálculo por haversine no webhook, guardar `is_inside` da leitura anterior por veículo em `device_trip_state` (já existe) — adicionar coluna `geofence_state jsonb` mapeando `place_id → bool`.
- Service worker de push é isolado (`/sw-push.js`, escopo `/`), não conflita com o PWA app-shell atual.