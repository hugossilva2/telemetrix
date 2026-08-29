# Traçado real das viagens (caminho feito pelo veículo)

## O que está acontecendo

Verifiquei no banco: **todas** as viagens dos últimos 30 dias estão com o traçado (`route_data`) vazio. Os pontos do percurso, porém, **existem**: a tabela de pings guarda uma posição a cada ~15 segundos (ex.: a viagem de hoje 16:04 tem 63 pontos). Quando o app não encontra traçado salvo, ele desenha só uma linha reta do ponto inicial ao final — é exatamente o que aparece na sua tela.

Ou seja: os dados estão lá, falta usá-los. É simples de arrumar.

## O que vou fazer

1. **Viagens novas**: quando o rastreador desligar o carro e a viagem for fechada, o servidor passa a montar o traçado com todos os pings daquele intervalo e a gravar junto da viagem, já encaixado nas ruas pelo Google (Snap to Roads), como você escolheu.

2. **Viagens antigas (últimos 30 dias)**: um botão "Reconstruir traçados" na tela de Diagnóstico, que percorre as viagens sem traçado, monta o percurso a partir dos pings, encaixa nas ruas e salva. Processa em lotes com barra de progresso e pode ser repetido sem duplicar (só toca em viagens sem traçado).

3. **Segurança contra custo**: o encaixe nas ruas é limitado — no máximo ~2 requisições Google por viagem (usa até 200 pontos, reduzindo por amostragem quando houver mais). Se o Google falhar ou a cota acabar, a viagem é salva com o traçado bruto dos pings mesmo (ainda muito melhor que a linha reta) e o app mostra isso no rodapé do mapa.

4. **Mapa da viagem**: como já lê `route_data`, passa a mostrar o caminho colorido por aceleração/frenagem automaticamente. Adiciono uma reserva: se ainda não houver traçado salvo, o mapa busca os pings da viagem na hora, em vez de mostrar linha reta.

## Detalhes técnicos

- Novo módulo `src/lib/trips/trailFromPings.server.ts`: lê `tracker_pings` por `vehicle_id` + janela `start_time..end_time`, filtra jitter (<5 m), reduz por amostragem para ≤200 pontos e devolve `TrailPoint[]`.
- Nova função `snapTrailForServer` reutilizando a lógica atual de `snapToRoads.functions.ts` (extraída para `snapToRoads.server.ts`, sem middleware de auth, para poder ser chamada pela ingestão).
- `ingest.server.ts`: no fechamento da viagem, após o `upsert` em `trips`, monta `buildRouteData({ trail, snappedPoints, source: 'fmc003' })` e grava em `route_data` (update pelo id retornado). Erros no snap não interrompem o fechamento.
- Novo server fn `src/lib/trips/rebuildRoutes.functions.ts` (`.middleware([requireSupabaseAuth])`, RLS do usuário): parâmetro `days` (padrão 30, máx 60) e `limit` por chamada (padrão 10) para caber no tempo de execução; retorna `{ processed, snapped, skipped, remaining }`. A UI chama em loop até `remaining = 0`.
- UI: card "Traçado das viagens" em `/diagnostico` com contagem de viagens sem traçado, botão de reconstruir e progresso.
- `viagens.$id.tsx`: se `parseRouteData` devolver nulo, faz consulta de fallback nos pings da janela da viagem para desenhar o percurso.
