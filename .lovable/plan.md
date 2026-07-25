## Fase 1 — Correções e Dashboard "ao vivo"

Nesta rodada, sem locais favoritos/ETA (fica para fase 2 com OpenRouteService).

### 1. Zerar telemetria com motor desligado

Quando `engine.ignition.status === false`, o Dashboard deve exibir tudo em estado "desligado" em vez de mostrar o último valor recebido do MQTT (que persiste no cache).

Regras aplicadas em `src/routes/_authenticated/index.tsx`:
- Velocidade: `0 km/h` (fixo)
- RPM: `0`
- Combustível: `—` com nota "Disponível com o motor ligado" (já é assim, mas hoje mostra o último 60% em cache — vamos limpar quando `ignitionOn === false`)
- Odômetro: continua exibindo o valor real (é cumulativo, faz sentido mostrar)
- Cards ganham estilo esmaecido (opacidade reduzida) quando desligado, reforçando o estado

### 2. Remover cartão "Bateria"

O usuário confirmou: é a bateria interna do FMC003, não interessa.
- Remove o `TelemetryCard` de bateria do Dashboard
- Remove o alerta "Bateria baixa" e o toggle correspondente em Ajustes
- Migração para dropar a coluna `alert_low_battery` de `vehicles`

### 3. Velocidade em "tempo real"

Hoje o MQTT chega a cada ~15s. Enquanto isso, a UI fica congelada. Melhorias:
- Assinar também o tópico `flespi/state/gw/devices/{id}/telemetry/position.speed` (já é feito) e o `.../position` (já é feito). Confirmar que o parser aplica `speed` imediatamente sem esperar o pacote completo — já faz.
- Adicionar um indicador visual "atualizado há Xs" no card de velocidade, para deixar claro que o número é da última amostra.
- Quando `ignitionOn === true` mas a última amostra tem mais de 20s, exibir badge sutil "aguardando…" no card.

Observação honesta: não dá para ter velocidade "verdadeiramente realtime" com o FMC003 mandando a cada 15s. O que dá para melhorar é o feedback visual. Se quiser mais frequência, é config no próprio Flespi (data-forwarding / intervalos do device) — fora do escopo do app.

### 4. Mini-mapa + cronômetro + consumo no Dashboard

Novo componente `OngoingTripCard` (substitui/expande o atual `OngoingTripBanner`), visível apenas quando existe viagem aberta (`useOpenTrip()` retorna algo):

Layout (topo do Dashboard, acima dos cards de telemetria):
- Mini-mapa (altura ~180px) com o rastro da viagem atual e marcador do carro na posição atual, seguindo o padrão do `TripMap` mas em versão compacta.
- Linha de KPIs abaixo do mapa:
  - ⏱️ Tempo decorrido (cronômetro atualizando 1×/s)
  - 📏 Distância percorrida (via delta de odômetro, cai para GPS)
  - ⛽ Consumo estimado em L (`distância / kmpl do veículo`)
  - 💰 Custo estimado (`litros × preço do último abastecimento || R$ 5,89`)

Reaproveita `SpeedPolyline`, `startIcon`, `endIcon` e a lógica já existente em `mapa.tsx` (o trail é montado lá — vamos extrair para um hook `useOngoingTripTrail()` em `src/lib/trips/` para o Dashboard e o Mapa consumirem o mesmo estado).

### 5. Viagem perdida (trabalho → casa)

Diagnóstico atual:
- Existe apenas 1 viagem em `trips` (14,2 km, 24/07 11:22 → 11:55).
- `device_trip_state` está vazio.

`device_trip_state` vazia é normal DEPOIS de fechar uma viagem (o webhook faz `DELETE`). Não é sinal de falha.

Hipóteses para a viagem perdida:
1. **A mensagem OFF do Flespi nunca chegou ao webhook.** Sem ela o servidor não fecha. Vou adicionar log detalhado (via `console.log` no handler) para vermos em `stack_modern--server-function-logs` os próximos eventos e o `deviceId`/`ign` que chegam.
2. **Filtro de ruído descartou.** Regras atuais: `distance < 100m E duration < 60s` → descarta. Viagem real trabalho→casa não deveria cair aí. Vamos manter.
3. **Payload sem `device.id`.** Se o Flespi manda o campo com outro nome (ex.: `ident`), o loop faz `continue` silencioso. Vou adicionar fallback: tentar `device.id`, `ident`, `cid` e logar quando nenhum casar.
4. **Ordem cronológica.** Se o Flespi enfileirou mensagens fora de ordem, uma antiga com `ign=true` pode reabrir uma viagem já fechada. Vou comparar `timestamp` da mensagem com `state.updated_at` e ignorar mensagens mais antigas.

Ações concretas no webhook:
- Adicionar logs (device id, ignition, timestamp, ação tomada) para todos os eventos.
- Adicionar fallback de `deviceId` (`device.id` → `ident` → `cid`).
- Ignorar mensagens fora de ordem (`msg.timestamp * 1000 < state.updated_at`).

Depois eu peço para você fazer uma viagem curta de teste e leio os logs para confirmar que o webhook está recebendo e classificando os eventos corretamente. Se não estiver chegando nada, o problema é a configuração no painel Flespi (URL/secret/formato do payload), e vou te passar o passo-a-passo para verificar.

### Arquivos afetados

- `src/routes/_authenticated/index.tsx` — zera telemetria com motor off, remove card de bateria, insere `OngoingTripCard`.
- `src/routes/_authenticated/ajustes.tsx` — remove toggle de bateria baixa.
- `src/components/dashboard/StatusHeader.tsx` — pequena revisão do texto quando desligado.
- `src/components/trips/OngoingTripCard.tsx` — novo (substitui `OngoingTripBanner` no Dashboard; banner segue existindo em outras telas se aplicável).
- `src/components/map/MiniTripMap.tsx` — novo, versão compacta do TripMap.
- `src/lib/trips/useOngoingTripTrail.ts` — novo hook que centraliza o trail atual (extraído do `mapa.tsx`).
- `src/routes/api/public/flespi-webhook.ts` — logs, fallback de deviceId, guarda contra mensagens fora de ordem.
- Migração: `ALTER TABLE vehicles DROP COLUMN alert_low_battery;`

### O que fica para a Fase 2 (quando você quiser)

- Locais favoritos (Casa/Trabalho/Academia): CRUD em Ajustes, tabela `saved_places` com RLS.
- ETA "estilo Waze" usando OpenRouteService (grátis, sem trânsito em tempo real — o ETA será baseado em velocidades típicas por tipo de via, não em congestionamento real).
- Botão "Estou indo para X" no Dashboard mostra distância + ETA estimado.
