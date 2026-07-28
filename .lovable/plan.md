## Objetivo

Criar um **Perfil do Motorista** com foto, análise de consumo, direção segura e partida segura, consolidados em uma pontuação única (0–100) com selos de destaque.

## Fase 1 — Vincular viagens ao condutor (base de dados)

- Toda viagem nova passa a ser salva com o motorista marcado como **padrão** (o app hoje nunca preenche `driver_id` — confirmado: 37 viagens, nenhuma com condutor).
- Vincular as 37 viagens existentes ao condutor padrão.
- Nova tabela `safe_starts` (por usuário e motorista): data/hora, minutos parado, RPM mínimo, se exigiu partida segura e se liberou. O histórico local atual continua funcionando e passa a espelhar no banco.
- Na tela de detalhe da viagem, permitir trocar o condutor.

## Fase 2 — Perfil do motorista

Nova rota `/motoristas/{id}` (acessível ao tocar no condutor na lista):

- Cabeçalho com **foto** (avatar grande, iniciais como fallback), nome, CNH/categoria e alerta de vencimento.
- **Nota geral** em anel colorido, média ponderada de três pilares:
  - Direção segura (60%): eco score das viagens — freada brusca, aceleração agressiva, curva, excesso de velocidade, giro alto.
  - Eficiência de consumo (30%): km/L real do condutor comparado ao consumo de referência do veículo.
  - Partida segura (10%): % de partidas em que respeitou a circulação do óleo.
- **Cartões de métrica**: total de viagens, km rodados, tempo ao volante, km/L médio, custo por km, litros e reais desperdiçados, marcha lenta.
- **Eventos de direção**: contagem por tipo com barras, e evolução da nota nos últimos meses.
- **Destaques (selos)** concedidos automaticamente: Direção Exemplar (nota ≥ 90), Zero Freadas Bruscas no mês, Pé Leve (sem aceleração agressiva), Economia Máxima (km/L acima da referência), Partida Perfeita (100% de partidas seguras), Sem Excesso de Velocidade.
- Lista das últimas viagens do condutor com nota individual, link para o detalhe.

## Fase 3 — Ranking e integração

- Na lista `/motoristas`: foto, nota e selo principal de cada condutor, ordenados por nota (ranking quando houver mais de um).
- No Painel: cartão compacto do condutor padrão com nota atual.
- Cartão de Partida Segura passa a mostrar também a taxa de acerto do condutor.

## Detalhes técnicos

- Fotos: `photo_path` já existe em `drivers`, servido por URL assinada do bucket privado `vehicle-docs` (mesmo fluxo de `openDocFile`).
- Cálculo da pontuação em `src/lib/drivers/score.ts` (puro, testável); leitura agregada de `trips` por `driver_id` via TanStack Query.
- Migração: `ALTER TABLE trips` não é necessária (`driver_id` já existe); criar `safe_starts` com GRANTs e RLS por `auth.uid()`; UPDATE de backfill nas viagens antigas.
- Componentes novos: `DriverAvatar`, `DriverScoreCard`, `DriverBadges`, `DriverStats`.

Entrego fase por fase, validando antes de avançar.
