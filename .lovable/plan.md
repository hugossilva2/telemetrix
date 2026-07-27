## Reteste do Green Driving (feito agora)

Consultei de novo a API da Flespi: **1.000 mensagens dos últimos 3 dias**, a mais recente hoje às 10:34.

**Resultado: o rastreador continua NÃO enviando Green Driving nem acelerômetro.** Nenhuma chave `green.driving.*`, `accelerometer.*`, `axis.*` ou de freada/colisão aparece nas mensagens.

O que o device manda hoje (todas as chaves úteis):
- `position.speed`, `can.vehicle.speed`, `position.direction`, `position.latitude/longitude`, `position.satellites/hdop/valid`
- `can.engine.rpm`, `can.engine.load.level`, `can.engine.coolant.temperature`, `can.fuel.level`, `can.mil.mileage`, `can.dtc.number`
- `engine.ignition.status`, `movement.status`, `vehicle.mileage`, `vehicle.vin`, `event.enum`
- Amostragem com motor ligado: **mediana de 6 s** entre mensagens

Para ter os eventos nativos do acelerômetro seria preciso habilitar o **Green Driving** na configuração do FMC003 (via Teltonika Configurator/FOTA), definindo os limites de freada/aceleração/curva. Enquanto isso não acontece, dá para calcular a nota muito bem com velocidade + direção + RPM + carga do motor, que já chegam. O código fica preparado para os dois casos.

---

## O que vou construir

### 1. Detector de eventos de direção
Analisa cada par de amostras da viagem (ao vivo e também no histórico importado):

- **Freada brusca** — queda de velocidade acima de ~9 km/h por segundo (moderada) e ~13 km/h/s (severa)
- **Aceleração agressiva** — ganho acima de ~8 km/h/s, reforçado por `can.engine.load.level` alto
- **Curva acentuada** — variação de `position.direction` combinada com a velocidade (aceleração lateral estimada acima de ~0,35 g)
- **Excesso de giro** — RPM acima de ~3.500 sustentado
- **Excesso de velocidade** — acima de um limite configurável (padrão 110 km/h)
- **Marcha lenta parada** — motor ligado e parado por mais de 3 minutos

Se um dia chegarem `green.driving.type/value` ou os eixos do acelerômetro, o detector passa a priorizar esses eventos automaticamente.

### 2. Nota de 0 a 100 por viagem
Começa em 100 e cai por penalidade ponderada **por 100 km** (viagem longa não é punida), com pesos por tipo e severidade. Faixas: 90–100 excelente, 75–89 bom, 60–74 regular, abaixo de 60 agressivo.

Também calculo o **desperdício estimado**: litros e reais gastos a mais por freadas, acelerações e marcha lenta, usando o consumo médio do veículo e o último preço por litro lançado.

### 3. Onde aparece

**Viagem em andamento** — nota ao vivo, contador de eventos do trajeto e aviso discreto quando registra um evento severo.

**Detalhe da viagem** — anel de pontuação grande, gráfico do perfil de velocidade com os eventos marcados no ponto exato, lista de eventos (tipo, horário, velocidade antes/depois), card de desperdício em litros e R$, e marcadores dos eventos no mapa da rota.

**Lista de viagens** — badge com a nota em cada viagem.

**Nova tela "Eco Score"** (dentro de Gestão) — nota média do mês vs. mês anterior, evolução por viagem, distribuição dos eventos por tipo, economia potencial acumulada, conquistas simples (sequência acima de 90, semana sem freada brusca, melhor viagem do mês) e nota por motorista quando houver condutor na viagem.

**Ajustes** — limites configuráveis (velocidade máxima, RPM de alerta) e liga/desliga do aviso em tempo real.

---

## Detalhes técnicos

**Migração** — novas colunas em `trips`: `eco_score`, `harsh_brake_count`, `harsh_accel_count`, `harsh_corner_count`, `overspeed_count`, `high_rpm_count`, `idle_seconds`, `wasted_fuel_liters`, `wasted_cost` e `eco_events` (jsonb com tipo, horário, lat/lng, velocidade e severidade). Sem tabela nova.

**Front**
- `src/lib/eco/detect.ts` — detecção a partir de amostras `{t, speed, heading, rpm, load, lat, lng}`
- `src/lib/eco/score.ts` — pesos, nota, faixas de cor, desperdício estimado
- `src/lib/flespi/parse.ts` e `types.ts` — passam a ler `position.direction`, `can.vehicle.speed`, `can.engine.load.level`, `movement.status` e, se aparecerem, `green.driving.*` / eixos do acelerômetro
- `src/lib/trips/store.ts` — o rastro guarda direção e RPM; a viagem aberta acumula os eventos
- `src/lib/trips/saveTrip.ts` — grava nota, contadores e eventos ao desligar o motor
- `src/lib/trips/reconstruct.ts` + backfill — viagens importadas do histórico também ganham nota
- Nova rota `src/routes/_authenticated/eco.tsx`, anel de nota e gráficos com recharts (já instalado), link no hub de Gestão

**Limitação honesta:** com amostras a cada ~6 s, freadas muito curtas podem escapar — a nota é uma boa estimativa, não medição inercial. Habilitar o Green Driving no FMC003 elimina essa limitação, e o app já estará pronto para consumir esses eventos.
