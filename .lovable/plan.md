## Objetivo

Fechar as lacunas de **gestão** do Telemetrix. Hoje o app cobre telemetria, mapa, rastreador, viagens, abastecimento e lugares — mas não guarda nada sobre **quem dirige**, **documentos do veículo** e **custos que não são combustível**.

Entrego em 3 fases, com validação sua entre cada uma.

---

## Fase 1 — Motoristas e Documentos

**Motoristas (vários por veículo)**
- Nova tela `/motoristas`: cadastro com nome, foto, telefone, número da CNH, categoria e validade.
- Cada motorista pertence à sua conta; um deles pode ser marcado como "padrão".
- Vínculo com viagens: campo "condutor" na viagem. Ao ligar o carro, se houver mais de um motorista cadastrado, o app pergunta rapidamente quem está dirigindo (com o padrão pré-selecionado); dá para corrigir depois no detalhe da viagem.
- Filtro por condutor na lista de viagens e no relatório mensal.

**Documentos do veículo**
- Nova tela `/documentos`: CRLV, seguro, IPVA, licenciamento, inspeção e "outro".
- Cada documento tem tipo, número/apólice, emissor, valor, data de vencimento e arquivo anexo (foto, PDF ou documento — mesmo padrão de upload já usado no abastecimento).
- Bucket privado de storage com URL assinada para abrir/baixar.
- Painel de vencimentos: cartões coloridos (verde / amarelo ≤30 dias / vermelho vencido), incluindo a validade da CNH de cada motorista.
- Aviso de vencimentos próximos no Dashboard.

## Fase 2 — Manutenção e revisões

- Nova tela `/manutencao` com dois blocos:
  - **Histórico**: serviço realizado (troca de óleo, pneus, freios, revisão, outro), data, odômetro, oficina, custo e nota fiscal anexa.
  - **Lembretes**: regra por km e/ou por data (ex.: "óleo a cada 10.000 km ou 12 meses"). O odômetro que já chega do rastreador alimenta a barra de progresso "faltam X km".
- Alerta no Dashboard quando um serviço está a menos de 500 km ou 30 dias do vencimento.

## Fase 3 — Despesas e relatórios

- Nova tela `/despesas` para custos fora do combustível: pedágio, estacionamento, lavagem, multa, seguro, manutenção, outros — com data, categoria, valor, observação e comprovante.
- Multas com campo de vencimento e de motorista responsável.
- **Relatório mensal consolidado** (evoluindo a tela de Viagens): combustível + manutenção + despesas, custo total por km, gráfico de composição por categoria e comparativo com o mês anterior.
- Exportação em CSV do mês.

---

## Detalhes técnicos

Banco (Supabase, todas com RLS por `auth.uid()` e GRANTs):
- `drivers` — nome, foto, telefone, cnh_numero, cnh_categoria, cnh_validade, is_default
- `vehicle_documents` — vehicle_id, tipo (enum), numero, emissor, valor, vencimento, arquivo_path
- `maintenance_logs` — vehicle_id, tipo (enum), data, odômetro, oficina, custo, arquivo_path
- `maintenance_reminders` — vehicle_id, tipo, intervalo_km, intervalo_meses, último serviço
- `expenses` — vehicle_id, driver_id, categoria (enum), data, valor, observação, arquivo_path
- `trips` ganha coluna `driver_id`

Storage: um bucket privado `vehicle-docs` para documentos, manutenção e despesas, com policies por pasta do usuário; leitura via URL assinada.

Front: rotas em `src/routes/_authenticated/`, leitura com TanStack Query, uploads reaproveitando o componente de anexo já feito no abastecimento, navegação inferior reorganizada (as telas novas entram sob um item "Gestão" para não estourar a bottom bar mobile), tokens de cor do design system existente.

Notificações push ficam de fora por ora (a tabela `push_subscriptions` já existe e pode ser ativada numa fase futura).
