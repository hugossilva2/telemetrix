## Modo Viagem Longa — paradas inteligentes e autonomia

Estado atual confirmado: `src/lib/trips/plan.ts` já guarda o plano (`distanceKm`, `durationSeconds`, `fuelLiters`, `path`) e expõe `remainingPathKm()`/`distanceToPathKm()`; `planRoute.functions.ts` já chama o Google Routes v2 com `TRAFFIC_AWARE`; a telemetria tem `fuelLevel` (%) em `src/lib/flespi/types.ts`; `specs.ts` define tanque de 48 L; push já está implementado em `src/lib/push/*`.

### Fase 1 — Autonomia e alerta de reabastecimento (base)
- Novo módulo `src/lib/trips/longTrip.ts` (puro, testável):
  - `autonomyKm(fuelPercent, kmpl)` usando `tankL = 48` e `expectedKmpl()` de `specs.ts`.
  - `refuelPoint(path, autonomyKm)` → km/coordenada aproximada onde o tanque acaba na rota.
  - `restStops(durationSeconds, path)` → paradas sugeridas a cada 2h de trajeto.
  - Limiar para considerar "viagem longa": distância > 150 km **ou** duração > 2h (ajustável).
- Fallback quando não há `fuelLevel` (caso do ELM327 sem PID de nível): slider "tanque atual" no dialog do plano, guardado no próprio `TripPlan`.

### Fase 2 — UI no plano de rota (`/planejar`)
- Card "Viagem longa" aparece só quando o plano cruza o limiar:
  - autonomia estimada vs. distância restante, com badge verde/amarelo/vermelho;
  - lista de paradas de descanso sugeridas (a cada ~2h) com horário previsto;
  - aviso "reabastecer em ~X km" quando a autonomia não cobre o trajeto.
- Marcadores das paradas e do ponto de reabastecimento no `PlanMap.tsx`.

### Fase 3 — Monitoramento durante a viagem
- Estender o hook existente de monitoramento do plano para, além do desvio, avaliar:
  - km restantes (`remainingPathKm`) vs. autonomia atual → toast + push "reabasteça";
  - tempo dirigindo desde a última parada → push "hora de descansar" a cada 2h;
  - check-in ao passar por uma parada sugerida.
- Cada alerta dispara no máximo uma vez por gatilho (estado no `TripPlan`).

### Fase 4 — Notificar o observador
- Reaproveitar `src/lib/push/send.server.ts` para repassar ao observador: início da viagem longa, check-ins de parada e alerta de reabastecimento.

### Detalhes técnicos
- Sem mudança de schema no Supabase na Fase 1–3 (estado no `TripPlan` em localStorage). Se você quiser histórico de paradas, na Fase 4 criamos `long_trip_events` com RLS + GRANTs.
- Nenhuma nova dependência; usa Google Routes já integrado e o cálculo de consumo Inmetro existente.
- Postos de combustível reais (Places nearby) ficam como opção extra depois — hoje o ponto de reabastecimento é calculado sobre a própria rota.

Começo pela Fase 1 + 2 e paro para você validar em tela antes de mexer no monitoramento ao vivo.