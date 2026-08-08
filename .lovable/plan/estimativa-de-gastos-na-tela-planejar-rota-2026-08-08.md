# Estimativa de gastos na tela Planejar rota

Hoje a tela só mostra distância, tempo, litros e custo depois de clicar em "Calcular rota", usando o preço do último abastecimento e o consumo médio do veículo. Vamos transformar isso numa estimativa de gastos completa e automática.

## O que muda

**1. Cálculo automático**
- Assim que origem e destino estiverem definidos, a rota é calculada sozinha (com pequeno atraso para agrupar mudanças).
- Adicionar/remover parada recalcula automaticamente.
- O botão passa a ser "Recalcular rota" (útil para atualizar o trânsito), com indicador de carregamento.

**2. Ida e volta**
- Alternância "Só ida / Ida e volta".
- Em ida e volta, distância, tempo, litros e custo de combustível são dobrados (a rota no mapa continua sendo o trajeto de ida).

**3. Pedágios e ajustes**
- Campo de pedágios (R$), somado ao total.
- Campos editáveis de preço por litro (R$/L) e consumo (km/L), pré-preenchidos com o último abastecimento e a média do veículo ativo, com botão para voltar aos valores padrão.

**4. Novo bloco "Estimativa de gastos"**
- Linhas: combustível (litros × R$/L), pedágios, e **Total da viagem** destacado.
- Rodapé com "custo por km" e a base usada no cálculo.

Todos os valores (ida/volta, pedágio, preço, consumo) ficam salvos junto do plano no aparelho, então continuam ao voltar para a tela.

## Detalhes técnicos

- `src/lib/trips/plan.ts`: adicionar ao `TripPlan` os campos `roundTrip`, `tollCost`, `pricePerLiter`, `kmpl` (opcionais, com leitura tolerante a planos antigos salvos).
- `src/lib/trips/cost.ts`: nova função pura `estimatePlanCost({ distanceKm, kmpl, pricePerLiter, roundTrip, tollCost })` retornando `{ distanceKm, fuelLiters, fuelCost, tollCost, total, costPerKm }`, coberta por validação numérica (valores negativos/não numéricos caem para 0 ou padrão).
- `src/routes/_authenticated/planejar.tsx`: `useEffect` com debounce (~600 ms) disparando a mutation quando origem/destino/paradas mudam; novo componente de UI `TripCostCard` em `src/components/trips/TripCostCard.tsx` com os inputs e o resumo. Inputs numéricos validados (mín. 0, máximos razoáveis) antes de entrar no cálculo.
- Sem mudanças no banco e sem alteração no server function `planRoute`; `LongTripCard` continua usando `plan.distanceKm` do trajeto de ida.
