
# Calibrar scores pela ficha técnica do Cronos 1.3 Firefly

Hoje os limites de direção agressiva são genéricos (`DEFAULT_ECO_THRESHOLDS`: 8-11 km/h/s de aceleração, 3.500 rpm, 110 km/h) e o consumo usa um valor fixo de referência. Vamos amarrar tudo à ficha real do veículo e mostrar uma nota de desempenho durante a viagem.

## 1. Perfil do veículo (novo módulo)

Criar `src/lib/vehicles/specs.ts` com a ficha do Cronos Drive 1.3 2022 como perfil padrão:

- Motor 1.332 cm³, 109 cv (E) / 101 cv (G) a 6.250 rpm, torque 14,2 kgfm a 3.500 rpm
- 0-100 em 11,5 s, máxima 183 km/h, câmbio manual 5 marchas
- Peso 1.139 kg, tanque 48 L, pneus 185/60 R15
- Consumo Inmetro: 9,1 / 11,2 km/l (etanol) e 13,0 / 15,9 km/l (gasolina)

Derivações usadas pelos cálculos:
- **Aceleração de referência:** 100 km/h ÷ 11,5 s ≈ 8,7 km/h/s a plena carga → acelerar acima de ~70% disso já é agressivo para este motor.
- **Faixa econômica de giro:** 1.500-2.500 rpm (abaixo do torque máximo). Zona de eficiência boa até 3.000, ruim acima de 3.500, péssima acima de 4.500 (longe do pico de potência, alto consumo em uso urbano).
- **Consumo esperado** por faixa de velocidade, interpolando urbano ↔ rodoviário conforme o combustível selecionado.

## 2. Recalibrar detecção e score

- `src/lib/eco/detect.ts`: os thresholds passam a ser gerados a partir do perfil (`thresholdsFromSpec`) em vez de constantes fixas — aceleração moderada ~6 km/h/s e severa ~8,7 (o motor não entrega mais que isso sem abuso), freada moderada 8 / severa 12 (freio traseiro a tambor, exige mais antecipação), giro alto 3.200 / severo 4.200, curva mantendo 0,35 g (pneu 185/60 R15, altura 1.508 mm). Os thresholds salvos pelo usuário em Ajustes continuam prevalecendo.
- `src/lib/eco/score.ts`: `summarizeEco` passa a receber o km/l de referência do perfil (por combustível e perfil urbano/rodoviário da viagem) em vez do `kmpl = 10` fixo, e a penalidade de giro alto vira proporcional à distância da faixa econômica.
- `src/lib/drivers/score.ts`: o pilar de **eficiência** deixa de comparar só o desperdício interno e passa a comparar o consumo real da viagem com o consumo esperado do Cronos (100 = igual ou melhor que o Inmetro; cai proporcionalmente conforme fica abaixo). Pesos dos pilares seguem 60/30/10.

## 3. Nota de desempenho ao vivo durante a viagem

Novo `src/lib/eco/live.ts` + `src/components/eco/LivePerformanceBadge.tsx`:

- Classificação instantânea em 4 faixas — **Ótimo / Bom / Regular / Péssimo** — combinando rpm atual vs. faixa econômica, velocidade, suavidade da aceleração (janela de ~30 s) e eventos recentes.
- Badge com cor e ícone no `OngoingTripCard`/`TelemetryCard`, mais uma barra de "desempenho da viagem até agora" (média acumulada) e texto curto de coaching ("giro alto para 2ª marcha", "aceleração acima do que o 1.3 entrega").
- No fim da viagem, a nota média acumulada aparece no resumo, junto ao eco-score já existente.

## 4. Onde a ficha aparece

- Card "Ficha técnica" na tela de Gestão do veículo, com os dados acima e o combustível em uso (etanol/gasolina/misto) selecionável — a seleção alimenta as metas de consumo.
- Tela `/eco` ganha a linha "consumo esperado vs. real" com base no perfil.

## Detalhes técnicos

- Sem migração de banco: o perfil é constante em código e a preferência de combustível fica no localStorage junto de `ecoSettings:v1` (`getEcoSettings`/`saveEcoSettings`), com o `avg_consumption_kmpl` do veículo continuando como fallback.
- `detectBetween` mantém a assinatura atual (`th: EcoThresholds`), então nada quebra: só a origem dos valores muda.
- A nota ao vivo consome `useTelemetry()` (rpm, velocidade, carga) sem novas requisições ao servidor.
