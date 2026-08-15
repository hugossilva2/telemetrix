# Fase 3 — Reduzir consultas no laço de ingestão do rastreador

Objetivo: cortar as consultas repetidas por mensagem para que um lote de 500 mensagens não estoure o tempo do coletor, sem alterar nenhum comportamento visível (viagens, eventos, geofences, alertas).

## O que muda

1. **Uma única consulta ao veículo por dispositivo**
   - Passa a buscar de uma vez `id, user_id, avg_consumption_kmpl, signal_lost_notified_at, alert_geofence`.
   - Os dois blocos extras que reconsultavam o veículo (flag de sinal perdido e flag de geofence) são removidos e passam a usar o objeto já carregado.

2. **Cache de veículo por dispositivo**
   - Um mapa `deviceId -> veículo | null` fora do laço. Dispositivos desconhecidos também ficam no cache (valor nulo), evitando reconsulta a cada mensagem.
   - Ao limpar a flag de "sinal perdido", o objeto em cache também é atualizado, para que as mensagens seguintes do mesmo lote não tentem limpar de novo.

3. **Cache de lugares favoritos por usuário**
   - Mapa `user_id -> lugares com cerca ativa`, carregado na primeira mensagem daquele usuário no lote.

4. **Sem paralelismo**
   - O laço continua sequencial e ordenado por timestamp; a máquina de estados da ignição depende disso. O ganho vem só da remoção de consultas.
   - O guard de mensagens fora de ordem permanece exatamente como está (comparação com `updated_at` do estado, que é relido por mensagem).

## Resultado esperado

- Lote de 500 mensagens do mesmo dispositivo: 1 consulta de veículo + 1 de lugares favoritos (antes: até 1.500).
- Estado da viagem (`device_trip_state`) continua sendo lido por mensagem, porque é mutado dentro do próprio laço.
- Sem alteração de banco de dados nem de UI.

## Detalhes técnicos

- Arquivo único: `src/lib/flespi/ingest.server.ts`.
- Helpers internos `getVehicleForDevice(deviceId)` e `getPlacesForUser(userId)` com memoização por lote (mapas criados dentro de `ingestFlespiMessages`).
- Tipo do veículo em cache derivado do `select` unificado; contadores do resumo (`skippedUnknownVehicle` etc.) mantidos.

## Validação

- Simulação local do laço com um lote de mensagens do mesmo dispositivo, contando as consultas por tabela, confirmando 1 consulta de veículo e 1 de lugares.
- Conferir que transições liga/desliga geram os mesmos eventos e a mesma gravação de viagem, e que mensagens com timestamp retroativo continuam sendo descartadas.
