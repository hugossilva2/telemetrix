# Fase 4 — Entrega e operação

Objetivo: o app instalado funcionar de verdade (offline e avisos), nenhum serviço externo lento
travar o app, relatórios mostrarem todos os dados e nunca mais um erro de leitura parecer
"nenhum registro".

## 1. App instalável (offline + avisos)

O arquivo que faz o app funcionar offline é gerado por um plugin, mas não confirmei se ele
chega à pasta publicada. Primeiro passo: gerar a versão publicada e conferir se `sw.js`
está lá. Se estiver faltando, ajustar a geração para a pasta correta e confirmar depois,
com o arquivo respondendo na URL publicada.

## 2. Prazos e limites nas chamadas externas

Hoje só duas chamadas externas têm prazo máximo (mapa ao vivo e automações). Passam a ter
prazo e tratamento de falha claras: alinhamento do traçado às ruas, busca de endereço,
envio de avisos push e a leitura periódica dos dados do rastreador. Um serviço lento passa a
falhar rápido em vez de segurar o processamento.

## 3. Relatórios completos

Consultas que hoje cortam em 500/1.000 registros sem avisar (viagens, evolução, ranking de
motoristas, corridas, eco, equipe) passam a somar no banco ou paginar até o fim, para os
números não ficarem menores que a realidade em contas com muito histórico.

## 4. Erro deixa de parecer "vazio"

Telas de viagens, relatórios, corridas, aulas e eco passam a distinguir três situações:
carregando, sem registros e indisponível — esta última com o motivo em português e um botão
"tentar novamente".

## 5. Verificações antes de publicar

Um comando único que roda tipos, testes, lint e build, para nada quebrado ir ao ar.

## Detalhes técnicos

- Conferir saída do `vite-plugin-pwa` (`filename: "sw.js"`, `strategies: generateSW`) na saída
  Nitro/cliente publicada; ajustar `globDirectory`/cópia de assets se ausente.
- `AbortSignal.timeout` + tratamento de erro em `src/lib/maps/snapToRoads.server.ts`,
  `src/lib/geo/reverse.functions.ts`, `src/lib/push/send.server.ts`,
  `src/routes/api/public/flespi-poll.ts`; limite de concorrência no envio push.
- Agregações/paginação em `src/lib/trips/tripsList.ts`, `src/components/reports/TrendsDashboard.tsx`,
  `src/lib/drivers/{ranking,api}.ts`, `src/lib/rides/api.ts`, `src/lib/school/{api,teamApi}.ts`,
  `src/routes/_authenticated/eco.tsx`, `src/routes/_authenticated/viagens.$id.tsx`
  (RPC de soma no banco quando o total é o que importa; paginação por cursor no resto).
- Estados de erro usando `src/lib/errors/userMessage.ts` + `isError`/`refetch` do React Query.
- Script `check` no `package.json` (tsgo + vitest + eslint + build).

Validação: testes atuais (170) continuam passando, novos testes para as somas paginadas, e
confirmação do `sw.js` na saída publicada.
