## Parte A (revisada) — "Ir para" inicia viagem interna monitorada

Ao tocar num card de lugar favorito (dashboard e `/lugares`), a ação é **totalmente interna** ao app. Sem abrir Waze/Google Maps.

### Fluxo

1. Toque no card abre diálogo: **"Ir para {nome}?"**
   - Mostra ETA/distância já calculados pelo `FavoritePlacesEta`.
   - Botões: **Iniciar viagem** e **Cancelar**.

2. Ao confirmar **Iniciar viagem**, o app verifica o estado atual da telemetria MQTT:
   - **Ignição ON** → inicia imediatamente o monitoramento da viagem no app:
     - Salva destino ativo em `localStorage` (`activeTripDestination`: `{ placeId, name, lat, lng, startedAt }`).
     - `OngoingTripCard` passa a exibir:
       - Nome do destino no topo ("Indo para Casa").
       - Cronômetro desde `startedAt` (não depende do webhook — começa na hora do toque).
       - Distância restante até o destino (haversine, recalculada a cada ping MQTT).
       - ETA dinâmico (recalcula com Google Routes a cada ~60s enquanto em movimento).
       - KPIs de viagem em tempo real já existentes (velocidade, consumo, custo).
     - Toast: "Viagem iniciada — monitorando até {nome}".
   - **Ignição OFF** → não inicia timer ainda:
     - Salva destino como **pendente** em `localStorage` (`pendingTripDestination`).
     - Toast: "Motor desligado — a viagem começará automaticamente ao ligar o carro".
     - Quando `engine.ignition.status` transicionar `false → true` com destino pendente, promove para `activeTripDestination` e inicia o timer.

3. **Encerramento**:
   - Ao desligar ignição OU chegar dentro do raio da geofence do destino (usa `geofence_radius_m` do lugar, padrão 150m), limpa `activeTripDestination` e exibe toast "Chegou em {nome}".
   - Botão "Encerrar viagem" no `OngoingTripCard` para cancelar manualmente.

### Alterações de código

- `src/lib/trips/activeDestination.ts` (novo): helpers `getActiveDestination`, `setActiveDestination`, `clearActiveDestination`, `getPendingDestination`, `setPendingDestination`, `promotePendingToActive`, todos via `localStorage` + evento `storage` para sincronizar entre componentes.
- `src/components/dashboard/FavoritePlacesEta.tsx`: card vira botão que abre `<Dialog>` de confirmação. Remove qualquer link externo Waze/Maps.
- `src/routes/_authenticated/lugares.tsx`: mesmo diálogo de "Iniciar viagem" nos cards.
- `src/components/dashboard/OngoingTripCard.tsx`:
  - Lê `activeDestination` e mostra "Indo para {nome}" + distância restante + ETA.
  - Detecta chegada por geofence (dist ≤ raio) e chama `clearActiveDestination`.
  - Botão "Encerrar viagem".
- `src/hooks/useFlespiMqtt.ts` (ou um hook novo pequeno `useTripDestinationBridge`): observa transição de ignição OFF→ON e promove destino pendente; observa OFF para limpar destino ativo.

### Fora de escopo

- Sem mudanças de schema no Supabase.
- Sem navegação turn-by-turn (o app apenas monitora e mostra ETA/distância — não dá instruções de curva).
- Sem alterações no webhook nem em `trips`.
