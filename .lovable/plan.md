# Correções da análise técnica — plano por fases

Li o documento inteiro (28 itens) e confirmei no código os pontos principais da primeira
etapa: a permissão de compartilhamento só compara o dono declarado (não confere se o carro
é dele), o convite de equipe aceita qualquer papel e o aceite grava esse papel direto,
a consulta de telemetria aceita qualquer identificador de rastreador sem checar de quem é,
as notificações aceitam veículo e texto vindos do aparelho, e o bloqueio de endereços
internos nas automações só cobre formatos IPv4.

Trabalho em fases, valido cada uma e peço sua permissão antes de seguir para a próxima.

## Fase 1 — Isolamento entre contas (mais urgente)

1. Compartilhamento: só aceitar criar/alterar convite de um carro que realmente é seu.
2. Convites de equipe: ninguém convida alguém como proprietário; instrutor só convida aluno.
3. Telemetria ao vivo: o app passa a pedir pelo carro (não pelo código do rastreador), e o
   servidor confere o vínculo antes de consultar a Flespi.
4. Vínculo carro ↔ rastreador: um rastreador só pode estar em um carro; conflito passa a ser
   erro claro em vez de "carro desconhecido".
5. Abastecimentos, viagens e aulas: recusar registros que apontem para carro, aluno ou
   organização de outra conta.
6. Notificações: conferir o direito sobre o carro, validar o tipo do evento, limitar o
   tamanho do texto e evitar repetição.
7. Automações: bloquear também endereços internos em IPv6 e IPv4-em-IPv6, recusar
   redirecionamentos e aplicar prazo máximo de resposta.

Validação: testes automáticos que tentam esses acessos com duas contas diferentes e recebem
recusa, sem quebrar os compartilhamentos legítimos.

## Fase 2 — Viagens que não se perdem nem se misturam

- A viagem em andamento passa a nascer amarrada à conta, ao carro e à origem dos dados;
  troca de carro ou de conta não reaproveita a viagem anterior.
- Ao desligar, a viagem é gravada primeiro no aparelho e só depois enriquecida (mapa,
  combustível) — sem risco de desaparecer se a internet cair no momento errado.
- A fila offline deixa de apagar pendências por erro temporário: espera progressiva,
  identificador estável e repetição segura.
- O espelho que alimenta o modo observador deixa de escrever no estado interno do
  rastreador (hoje o navegador pode apagar/avançar o que o coletor gravou).
- Encerramento e Eco Score passam a dar o mesmo resultado com o app aberto ou fechado.

## Fase 3 — Números confiáveis

- Consumo medido: contar também os abastecimentos parciais entre dois tanques cheios
  (o exemplo do documento dá 15 km/L onde o certo é 10 km/L) e não juntar registros de
  combustíveis diferentes.
- Calibração: apagar o resultado quando a base deixa de existir e recalcular os dois carros
  quando um abastecimento é movido.
- Datas no fuso do usuário (abastecimento às 23h não pode cair no dia seguinte).
- Falta de dado deixa de virar nota zero / "Agressivo": passa a aparecer como "Sem dados".
- Preço de referência e listas por carro, não pelo último abastecimento qualquer.
- Aula vinculada só à viagem do carro e do instrutor daquela aula.

## Fase 4 — Entrega e operação

- Corrigir o app instalável: hoje o arquivo de funcionamento offline não vai para a pasta
  publicada, então offline e notificações não têm como funcionar numa instalação nova.
- Prazos máximos e limites nas chamadas externas (mapa, Flespi, push) para um serviço lento
  não travar o processamento.
- Paginação e somas no banco em relatórios e histórico (hoje cortam em 500/1.000 sem avisar).
- Erro de leitura deixa de parecer "nenhum registro"; telas mostram carregando / vazio /
  indisponível com opção de tentar novamente.
- Verificações automáticas antes de publicar (tipos, testes, migrações, build).

## Fase 5 — Acabamento

- Cor inválida no gráfico de abastecimento, permitir ampliar a tela com dois dedos,
  traduzir as telas de erro e 404, revisão de acessibilidade.
- Dividir os módulos maiores (ingestão e páginas grandes), atualizar README e documentação,
  limites de retenção de localização e anexos.

## Detalhes técnicos

- Migrações novas: `WITH CHECK` de `vehicle_shares` com `EXISTS` sobre `vehicles`; restrição
  de papel em `organization_invites` + guarda em `accept_org_invite`; índice único em
  `vehicles.flespi_device_id`; checagens de coerência em `fuel_logs`, `trips`, `lessons`,
  `instructor_vehicles`; reconciliação em `recompute_fuel_calibration`.
- `src/lib/flespi/lastKnown.functions.ts`: entrada passa a ser `vehicleId`, device resolvido
  via `context.supabase`.
- `src/lib/push/push.functions.ts` + `send.server.ts`: validação de veículo/tipo/tamanho.
- `src/lib/automations/run.server.ts`: validador de host cobrindo IPv6/IPv4-mapped,
  `redirect: "manual"`, `AbortSignal.timeout`.
- `src/lib/trips/store.ts`, `saveTrip.ts`, `offline/{queue,sync,db}.ts`,
  `tracker/livePublish.functions.ts`, `hooks/useLivePublish.ts`, `useLiveTripTracker.ts`.
- `src/lib/fuel/{measured,metrics}.ts` + função SQL de calibração com os mesmos exemplos de
  referência em testes.
- `vite.config.ts` / saída Nitro para o service worker; `.gitattributes` com LF.
