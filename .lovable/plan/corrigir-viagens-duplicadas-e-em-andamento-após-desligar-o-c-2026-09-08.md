&nbsp;

# Corrigir viagens duplicadas e "em andamento" após desligar o carro

## O que está acontecendo

Confirmei no banco: nenhuma viagem está realmente aberta (todas têm hora de fim), mas
existem **77 viagens duplicadas** entre as 332 gravadas — várias com o mesmo horário de
fim e horários de início diferentes, o que na tela aparece como viagens sobrepostas /
"em andamento" surgindo depois de você já ter desligado o carro.

Exemplo real de hoje: o rastreador fechou a mesma viagem às 11:50 três vezes, gravadas
às 11:52 e 11:54, com inícios 11:35 e 11:39.

Causa: quando o coletor que roda a cada 2 minutos encerra uma viagem, ele **não avança
o marcador da última mensagem lida**. Na rodada seguinte ele busca de novo o mesmo
trecho de mensagens no rastreador, vê o motor ligado ali atrás, abre uma nova viagem e
a fecha outra vez — repetindo o ciclo a cada 2 minutos até o marcador se ajustar.

## Fase 1 — Parar de criar duplicatas (correção da causa)

1. Ao encerrar a viagem, avançar o marcador da última mensagem lida para o horário da
  mensagem de desligamento, para o coletor nunca reler o mesmo trecho.
2. Só abrir uma nova viagem numa transição real desligado → ligado (ou na primeira
  mensagem de um rastreador sem estado nenhum). Hoje ele também abre quando o estado
   está "sem viagem", o que é exatamente o caso da releitura.
3. Usar o marcador da última mensagem (e não o horário do último gravado) na proteção
  contra mensagens fora de ordem, para não descartar mensagens boas nem aceitar
   reprocessamento.
4. Antes de gravar, recusar viagem que se sobreponha a outra já existente do mesmo
  veículo (mesmo fim, ou intervalo cruzando outra viagem).

## Fase 2 — Trava no banco

Adicionar uma restrição de unicidade por veículo + horário de fim, para que nenhum
caminho de gravação (app, webhook ou coletor) consiga repetir a mesma viagem, mesmo em
caso de erro futuro.

## Fase 3 — Limpar o histórico

Remover as 77 viagens duplicadas, mantendo em cada grupo a mais completa (a de maior
duração/distância, que é a que tem o trajeto inteiro). Rodo primeiro uma contagem do
que será apagado e mostro para você aprovar antes de excluir.

## Fase 4 — Conferir a tela

Revisar como a lista de viagens e o painel marcam "em andamento", garantindo que só a
viagem com o motor realmente ligado apareça assim, e testar um ciclo ligar/desligar
observando o resultado.

## Detalhes técnicos

- `src/lib/flespi/ingest.server.ts`: `clearTripFields` passa a receber o ISO da mensagem
e gravar `last_message_at`; `shouldOpen` deixa de incluir `state?.start_time == null`
quando `prevIgn === true`; guarda de fora de ordem passa a comparar com
`last_message_at`; checagem de sobreposição antes do `upsert` em `trips`.
- Migração: índice único `(vehicle_id, end_time)` em `public.trips` (após a limpeza da
Fase 3, senão a criação falha).
- `src/lib/trips/saveTrip.ts`: alinhar a janela antiduplicidade com a checagem de
sobreposição do servidor.
- Testes: cobrir "releitura da mesma janela não cria segunda viagem" e a detecção de
sobreposição em módulo puro.

Cada fase é validada antes de seguir para a próxima.