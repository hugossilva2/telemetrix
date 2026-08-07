# Mostradores no painel (velocidade, RPM, combustível)

Substituir os três cards de texto do painel por mostradores circulares em anel neon, no mesmo estilo visual do Eco Score, com ponteiro/arco animado.

## O que muda na tela

- Um bloco com três anéis lado a lado no topo da grade do painel:
  - **Velocidade** — 0 a 180 km/h, valor grande no centro, unidade abaixo.
  - **RPM** — 0 a 6.000, com a faixa eco do veículo ativo marcada em verde e a zona alta (acima do limite) em vermelho.
  - **Combustível** — 0 a 100%, com litros estimados do tanque do veículo e cor de alerta abaixo de 15%.
- No celular os três anéis ficam em uma linha (anéis menores); em telas maiores ganham mais respiro.
- Motor desligado: anéis vão a zero, ficam esmaecidos e mostram "—" no lugar do valor, mantendo o comportamento atual de zerar KPIs.
- Sem dado disponível (ex.: nível de combustível ausente no ELM327): o anel aparece vazio com legenda "sem dado", sem quebrar o layout.
- Os demais cards do painel (temperatura, odômetro, etc.) continuam exatamente como estão.

## Animação

- O arco e o número se movem suavemente até o novo valor (~300 ms, easing de saída), como um ponteiro real.
- Respeita `prefers-reduced-motion`: quem tiver movimento reduzido no sistema vê a atualização direta.

## Detalhes técnicos

- Novo componente `src/components/dashboard/GaugeRing.tsx`: SVG com anel de fundo, arco de progresso (`stroke-dasharray`/`stroke-dashoffset` com `transition`), zonas opcionais (eco/alta) e conteúdo central via `children`.
- Novo componente `src/components/dashboard/GaugeCluster.tsx`: agrupa os três anéis, recebe velocidade, RPM, combustível e o estado de ignição.
- `src/routes/_authenticated/inicio.tsx`: troca os três `TelemetryCard` de Velocidade, RPM e Combustível pelo `GaugeCluster`, reaproveitando os mesmos valores já calculados (`telemetry.canSpeedKmh ?? speedKmh`, `engineRpm`, `fuelLevel`).
- Faixa eco de RPM e tamanho do tanque vêm do veículo ativo (`useActiveVehicle`), sem constantes fixas.
- `TelemetryCard` permanece intacto, pois é usado pelos outros cards.
- Cores apenas por tokens semânticos (`--primary`, `--success`, `--warning`, `--destructive`), sem classes de cor fixas, mantendo o tema Neon Mint.
