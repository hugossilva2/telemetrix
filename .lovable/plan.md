# Fase 9A + 9B — Distância real em viagens circulares e ingestão à prova de duplicidade

## 9A — Distância acumulada ping a ping

Hoje, quando o rastreador não envia odômetro (`vehicle.mileage`), a distância da viagem é a linha reta entre o ponto inicial e o final. Ir ao mercado e voltar para casa dá praticamente zero quilômetro, e a viagem some (é descartada quando dura menos de 60 s).

Correção: somar a distância percorrida a cada atualização de posição, durante a viagem.

- Nova coluna `accum_distance_km` em `device_trip_state` (começa em 0).
- A cada mensagem com posição durante a viagem, soma o trecho entre a última posição e a nova.
- Dois filtros contra ruído de GPS:
  - trechos menores que ~10 m são ignorados (carro parado "vibrando" no mapa);
  - saltos que implicariam mais de ~200 km/h no intervalo são ignorados (reaquisição de sinal).
- Ao ligar o carro, o acumulado volta a zero.
- No fechamento, a ordem de preferência para a distância passa a ser: (1) diferença de odômetro, se disponível e positiva; (2) acumulado ping a ping; (3) linha reta início→fim, só como último recurso.

Resultado esperado: viagem circular sem odômetro registra distância próxima da real; viagens com odômetro continuam idênticas (e, por consequência, litros e custo estimado passam a fazer sentido nesses casos).

## 9B — Ingestão idempotente (webhook + coletor periódico)

O webhook do rastreador e o coletor periódico leem a mesma fonte. Se os dois estiverem ativos, ou se duas execuções do coletor se sobrepuserem, pode haver duplicação de pontos, viagens e eventos. Verificação no banco agora: 9 grupos de pontos duplicados e 1 grupo de viagem duplicada — ou seja, o problema já ocorreu.

- Limpeza das duplicatas existentes na mesma migração (mantém o registro mais antigo de cada grupo), antes de criar as restrições.
- Restrições de unicidade: um ponto por veículo/instante; uma viagem por veículo/horário de início.
- Nas gravações, reentrega passa a ser ignorada silenciosamente em vez de gerar erro.
- Trava de execução por rastreador (validade de 90 s) gravada em `device_trip_state`: quem pega a trava processa; a execução concorrente pula aquele rastreador e reporta isso no resumo. A trava é liberada no fim, inclusive quando dá erro.
- O resumo da ingestão passa a informar `skippedLocked` e `skippedDuplicate`.

Resultado esperado: reenviar o mesmo lote duas vezes não cria nada duplicado; duas execuções simultâneas do coletor — uma processa, a outra reporta que estava travado; operação normal fica inalterada.

## Detalhes técnicos

Migração (única, na ordem):

```sql
ALTER TABLE public.device_trip_state
  ADD COLUMN IF NOT EXISTS accum_distance_km NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingest_lease_until TIMESTAMPTZ;
COMMENT ON COLUMN public.device_trip_state.accum_distance_km IS '...fallback quando vehicle.mileage não está disponível.';

-- dedupe antes das constraints (preserva menor id por grupo)
DELETE FROM public.tracker_pings p USING public.tracker_pings q
  WHERE p.vehicle_id = q.vehicle_id AND p.recorded_at = q.recorded_at AND p.id > q.id;
DELETE FROM public.trips t USING public.trips u
  WHERE t.vehicle_id = u.vehicle_id AND t.start_time = u.start_time AND t.id > u.id;

ALTER TABLE public.tracker_pings ADD CONSTRAINT tracker_pings_unique_sample UNIQUE (vehicle_id, recorded_at);
ALTER TABLE public.trips ADD CONSTRAINT trips_unique_start UNIQUE (vehicle_id, start_time);
```

Observação: `vehicle_id` é nulável nas duas tabelas; hoje não há linhas com `vehicle_id` nulo, e a unicidade não cobre esse caso (NULLs são distintos no Postgres) — aceitável.

`src/lib/flespi/ingest.server.ts`:

- `shouldOpen` (≈l.384): grava `accum_distance_km: 0` e `ingest_lease_until` intacto.
- Bloco de viagem em andamento (≈l.498): calcula `haversineKm(state.last_lat, state.last_lng, lat, lng)`; aplica piso `>= 0.01 km` e teto `dtSeg > 0 && km/(dt/3600) <= 200`; grava `accum_distance_km: Number(state.accum_distance_km ?? 0) + inc`.
- Fechamento (≈l.411): odômetro → `accum_distance_km > 0` → haversine início→fim.
- Inserts: `tracker_pings` com `{ onConflict: "vehicle_id,recorded_at", ignoreDuplicates: true }` (via `upsert`), `trips` com `{ onConflict: "vehicle_id,start_time", ignoreDuplicates: true }`; quando o retorno indica nenhuma linha inserida, incrementa `skippedDuplicate`.
- Lease: antes do laço por mensagem, agrupa por `deviceId`; para cada device tenta
  `update device_trip_state set ingest_lease_until = now()+90s where device_id = X and (ingest_lease_until is null or ingest_lease_until < now()) returning device_id`.
  Sem linha e com estado existente → `skippedLocked++` e pula todas as mensagens do device. Device sem linha de estado ainda não existe: segue sem lease (o upsert de abertura cria a linha).
  `try/finally` libera (`ingest_lease_until = null`) inclusive em erro.
- `IngestSummary` ganha `skippedLocked` e `skippedDuplicate`; os logs de `flespi-webhook.ts` e `flespi-poll.ts` passam a mostrar os novos campos.

Também ajustado para não quebrar com as novas restrições: `src/lib/trips/saveTrip.ts` e `src/lib/trips/backfill.functions.ts` tratam conflito de unicidade (código 23505) como "duplicate" em vez de erro visível; `src/lib/tracker/livePublish.functions.ts` grava ping com `ignoreDuplicates`.

Tipos do Supabase regenerados após a migração. Testes: casos novos em `src/lib/flespi/` cobrindo o acúmulo de distância (piso de 10 m, teto de 200 km/h, viagem circular) rodados com `bun run test`.
