# Fase 2 — Consertar a gravação do traçado (tracker_pings)

## O que está errado (verificado no código)

Em `src/lib/flespi/ingest.server.ts` a amostragem de pontos compara o horário da mensagem
com `last_message_at`, que é atualizado a cada mensagem processada (linhas 363, 479 e 492).
Com o rastreador reportando a cada ~6 s com o carro ligado, a diferença nunca chega aos 20 s
exigidos e nenhum ponto é gravado; com o carro parado (keep-alive de hora em hora) o ponto passa.

Resultado: a posição ao vivo continua correta (vem de `device_trip_state`), mas o histórico
quebra — rota no mapa, mapa de calor e a linha do tempo do modo rastreador ficam vazios,
principalmente nas viagens gravadas pelo servidor com o app fechado, onde os pontos são a
única fonte do traçado.

## O que será feito

1. **Banco**: adicionar a coluna `last_ping_at` em `device_trip_state`, guardando o instante
   do último ponto realmente gravado — separada do horário da última mensagem recebida.
   Nenhuma mudança de permissão é necessária.
2. **Ingestão**: passar a comparar com `last_ping_at`. Quando um ponto for gravado, marcar uma
   variável local e incluir o novo horário no payload das escritas de estado que já acontecem
   depois no mesmo ciclo — sem nenhuma escrita extra por mensagem.
3. **Compatibilidade**: linhas existentes têm `last_ping_at` vazio; nesse caso o primeiro ponto
   é gravado imediatamente.
4. Regenerar os tipos do banco usados pelo app.

## Notas técnicas

- Migração: `ALTER TABLE public.device_trip_state ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ`
  + `COMMENT ON COLUMN` explicando a diferença em relação a `last_message_at`.
- `ingest.server.ts`: `lastPingMs` passa a ler `state?.last_ping_at` (NULL → 0); após o insert em
  `tracker_pings`, `pingWritten = true`. Os três pontos de escrita de estado (upsert de abertura
  linha 349, update de viagem em andamento linha 466, upsert de "desligado" linha 485) recebem
  `...(pingWritten ? { last_ping_at: nowIso } : {})`.
- O fechamento de viagem apaga a linha de `device_trip_state` (linha 452), então nada a fazer ali:
  a próxima viagem começa sem `last_ping_at` e grava o primeiro ponto na hora.
- `src/integrations/supabase/types.ts` é regenerado após a migração ser aplicada.

## Validação

- Simular uma sequência de mensagens com ignição ligada em intervalos de ~6 s e conferir no banco
  que sai ~1 ponto a cada 20 s.
- Conferir que uma sequência de keep-alives espaçados continua gravando 1 ponto cada.
- Conferir o traçado da viagem no mapa e a linha do tempo do modo rastreador.
