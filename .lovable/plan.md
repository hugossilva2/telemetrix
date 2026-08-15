# Fase 6 — Testes automatizados da lógica numérica

Objetivo: cobrir com testes os três módulos puros onde um erro de unidade ou sinal passa despercebido (detecção de eventos, pontuação e parsing de telemetria), sem tocar em rede, banco ou relógio real.

## O que será feito

1. **Infra de testes**
   - Adicionar `vitest` como devDependency e os scripts `test` (`vitest run`) e `test:watch` (`vitest`).
   - Configuração de teste em ambiente `node`, com o alias `@` resolvido pelo `vite-tsconfig-paths` já presente no projeto. A config de teste ficará isolada (arquivo próprio de config de teste), sem alterar o pipeline de build/PWA do app.

2. **`src/lib/eco/detect.test.ts`**
   - `harsh_brake` a partir de -8 km/h/s e `severe` a partir de -12.
   - `harsh_accel` acima do limite moderado e `severe` quando a carga do motor >= 75.
   - Pares descartados quando o intervalo entre amostras é menor que 1 s ou maior que 30 s.
   - `overspeed` e `high_rpm` disparam apenas na transição do limite, não em toda amostra acima dele.
   - Evento nativo de Green Driving tem precedência e volta sozinho.
   - Virada de rumo 350° → 10° conta como 20° (validado através da detecção de curva, já que a função de ângulo é interna ao módulo).
   - `idleBetween`: conta só com as duas amostras <= 2 km/h e devolve 0 para intervalos acima de 600 s.

3. **`src/lib/eco/score.test.ts`**
   - Viagem sem eventos e sem marcha lenta pontua 100.
   - Normalização por 100 km: os mesmos eventos em 200 km penalizam metade.
   - Litros desperdiçados respeitam o teto de 25% do consumo da viagem.
   - `high_rpm` acrescenta penalidade proporcional ao excesso sobre a faixa econômica.
   - 5 min de marcha lenta tiram exatamente 1 ponto por 100 km.
   - Score saturado em [0, 100] mesmo com muitos eventos severos.
   - `ecoBand` nos limites exatos 90, 75 e 60.

4. **`src/lib/flespi/parse.test.ts`**
   - Payload achatado (`"position.latitude"`) e aninhado.
   - Sem fix de GPS (`position.valid === false`), usa a velocidade do CAN.
   - Conversão booleana aceita `true`, `1`, `"1"`, `"true"` e os negativos.
   - JSON inválido devolve `null` sem lançar.
   - `parseFlespiStateTopic` extrai a chave depois de `/telemetry/` e trata o tópico `position` com objeto completo.
   - `mergeTelemetry` preserva o valor anterior quando o novo é `undefined`/`null`.

5. **Divergências são achados, não correções silenciosas**
   - Os testes descrevem o comportamento atual. Se algum revelar bug real (sinal, unidade, limite), a execução para e o achado é reportado antes de qualquer mudança na lógica.

Fora de escopo nesta fase: `ingest.server.ts` (mistura decisão e acesso ao banco; extrair as decisões puras é um refactor separado).

## Detalhes técnicos

- `vitest` roda com `environment: "node"`, `include: ["src/**/*.test.ts"]`, sem setup de DOM nem mocks de Supabase.
- Timestamps nos testes são valores fixos (nenhum `Date.now()`), garantindo determinismo.
- Limites de eco (`thresholdsFromSpec`) derivam da ficha técnica; os testes passam limites explícitos onde o valor exato importa, para não quebrarem se a ficha do veículo padrão mudar.

## Critério de aceite

- `npm run test` (ou `bun run test`) passa.
- Casos-limite dos três módulos cobertos.
- Nenhum teste depende de rede, banco ou relógio real.
