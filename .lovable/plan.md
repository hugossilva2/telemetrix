## Objetivo

Adicionar (1) um relatório semanal com médias de distância, velocidade, RPM e gasto de combustível, (2) botões de rotinas rápidas de conferência (óleo, arrefecimento, faróis, pneus, lavagem, água do limpador) com periodicidade própria, e (3) um indicador de Saúde do Veículo que mostra o que está pendente/atrasado.

## 1. Banco de dados (nova migração)

Tabela `vehicle_checkups` — registro de cada vez que o usuário confere um item:
- item (texto: oleo, arrefecimento, farois, pneus, lavagem, agua_limpador)
- veículo, motorista opcional, data/hora da checagem, odômetro no momento, observação
- Acesso: cada usuário vê e gerencia apenas os próprios registros (RLS + grants).

Sem tabela de configuração: as periodicidades ficam como padrão no código (editáveis depois se você quiser).

Periodicidades propostas:
| Rotina | Período |
|---|---|
| Óleo (nível) | semanal (7 dias) |
| Arrefecimento | semanal |
| Pneus (pressão) | semanal |
| Faróis / lanternas | mensal (30 dias) |
| Água do limpador | mensal |
| Lavagem | mensal |

Regra de status: em dia (verde) → a vencer nos últimos 20% do período (amarelo) → **pendente** quando passa do período (vermelho). Item nunca conferido entra como pendente.

## 2. Rotinas rápidas (nova aba/rota `/rotinas`)

- Grade de botões grandes, um por rotina, cada um com selo de status e “conferido há X dias”.
- Um toque registra a checagem agora (usa o odômetro da telemetria quando disponível) com confirmação em toast e desfazer.
- Toque longo / ícone abre um campo de observação opcional.
- Lista do histórico recente das checagens, com opção de excluir.

## 3. Saúde do Veículo

- Card no Painel: anel/barra de 0–100 combinando rotinas pendentes, alertas de manutenção (já existentes) e documentos vencendo.
- Cálculo: começa em 100; cada rotina a vencer −4, cada rotina pendente −10, cada manutenção próxima −6, vencida −12, documento vencido −10 (limitado a 0).
- Lista compacta “Pendências” com atalho para `/rotinas`, `/manutencao` ou `/documentos`.
- Rotinas pendentes também geram um toast por dia (mesmo padrão já usado nos alertas de manutenção).

## 4. Relatório semanal

Na tela de Relatório, adicionar um seletor Mensal | Semanal (mantendo tudo que já existe no mensal). Na visão semanal (segunda a domingo, com navegação semana anterior/próxima):
- Distância total e média por dia/viagem
- Velocidade média e máxima
- RPM médio e máximo (a partir dos dados de viagem/eco já gravados; exibe “—” quando o hardware não enviou RPM)
- Litros e gasto de combustível, custo por km
- Comparativo com a semana anterior (setas de alta/baixa, como já existe no mensal)
- Resumo das rotinas conferidas na semana e das pendentes
- Exportação CSV da semana

## Detalhes técnicos

- Nova migração para `vehicle_checkups` com GRANTs e RLS por `auth.uid()`.
- `src/lib/checkups/rules.ts`: catálogo de rotinas, períodos, cálculo de status e score de saúde (espelhando o padrão de `src/lib/maintenance/rules.ts`).
- `src/components/health/VehicleHealthCard.tsx` no Painel; `src/components/checkups/CheckupButtons.tsx`.
- Nova rota `src/routes/_authenticated/rotinas.tsx` com `head()` próprio, entrada na navegação e bloqueio para observadores via `ObserverGate`.
- Relatório: `src/lib/reports/week.ts` com `weekKey`/`weekRange`/`previousWeek`, reutilizando os agregadores existentes; métricas de RPM vindas das colunas de trips/eco.
- Também vou corrigir, sem alterar comportamento, o erro de hidratação que aparece hoje na rota de autenticação.
