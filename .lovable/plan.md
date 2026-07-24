## Dashboard completo da viagem em `/viagens/$id`

O card já é clicável e leva para `/viagens/$id`, mas hoje essa tela mostra só um resumo simples. Vou transformá-la num **dashboard completo** com comparações, projeções e contexto financeiro do mês.

### O que a nova página vai ter

1. **Cabeçalho** — data/hora de início, duração e badge "eficiente" quando aplicável.

2. **Mini-mapa** (já existe) com marcadores de início e fim.

3. **KPIs principais** (grid 2x3):
   - Distância
   - Duração
   - Velocidade média
   - Velocidade máxima
   - Consumo (km/L)
   - Custo estimado (R$)

4. **Início x Fim** — card lado a lado com horário e odômetro no início e no fim da viagem.

5. **Comparativo com viagens similares** (±20% da distância):
   - Consumo médio das similares vs. esta viagem, com % de diferença (verde se melhor, vermelho se pior).
   - Custo médio das similares vs. esta viagem.
   - Nº de viagens usadas na amostra; se não houver amostra, exibe "sem viagens similares ainda".

6. **Posição no mês** — mostra quanto essa viagem representa do mês atual:
   - "X% da distância do mês", "Y% do custo do mês".
   - Barra de progresso pequena para cada uma.

7. **Projeção do mês** (baseado no ritmo até hoje):
   - Estimativa de km, litros e custo até o fim do mês (regra de três simples: total_até_hoje ÷ dias_decorridos × dias_do_mês).
   - Card destacando o custo projetado em R$.

8. **Rodapé** — link "Ver todas as viagens do mês" voltando para `/viagens`.

### Detalhes técnicos

- Uma única query nova: `SELECT` das viagens do mesmo mês da viagem atual + viagens de distância similar (posso reaproveitar uma busca ampla e filtrar em memória, igual `/viagens` já faz). Continua tudo client-side com RLS.
- Cálculos puros em `useMemo` no componente — sem alterar schema, sem migration, sem tocar em `useTripRecorder` ou no webhook.
- Estilo mantém padrão atual (cards `rounded-2xl border bg-card`, `tabular-nums`, cores `emerald-500` para positivo e `rose-500` para negativo).
- Nenhum arquivo fora de `src/routes/_authenticated/viagens.$id.tsx` precisa mudar. Formatadores existentes (`formatBRL`, `formatDecimal`, `formatSpeed`, `formatDurationBetween`) são reutilizados.

### Fora de escopo (posso fazer depois se quiser)

- Gráfico histórico de consumo por viagem (recharts).
- Comparar duas viagens específicas lado a lado.
- Exportar PDF/CSV da viagem.

Posso implementar?
