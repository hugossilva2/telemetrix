# Telemetrix — 4 perfis de uso (Motorista, App, Instrutor, Autoescola)

Hoje o app é pensado para um motorista particular. A ideia é que, no cadastro, a pessoa escolha **como usa o carro**, e o app se adapte: menu, painel inicial, cadastros e relatórios. A base técnica (telemetria, viagens, abastecimento, manutenção, documentos, planos) continua a mesma para todos.

Decisões já tomadas: modo escolhido no cadastro e fixo por conta (trocável em Ajustes); instrutores e alunos com login próprio; corridas Uber/99 por lançamento manual rápido; modo independente do plano.

## Os 4 perfis

| Perfil | Quem é | O que muda |
| --- | --- | --- |
| **Motorista** (atual) | Uso pessoal | Nada muda. É o padrão. |
| **Motorista de app** (Uber/99) | Trabalha com o carro | Registro de corridas e turnos, ganhos x gastos, lucro por km, manutenção preventiva por rodagem alta. |
| **Instrutor autônomo** | 1 carro, ele mesmo, seus alunos | Alunos, agenda de aulas, aula vinculada à viagem gravada, evolução do aluno, cobrança por aula. |
| **Autoescola** | Vários carros, instrutores, alunos | Tudo do instrutor + equipe: convida instrutores (login próprio), aloca carro/instrutor por aula, visão do dono. |

Alunos (dos dois modos de ensino) entram com login próprio e veem só a área "Meu progresso": aulas feitas, próximas, trajetos, pontuação de direção e observações do instrutor.

## Como a pessoa entra em cada perfil

```text
Cadastro ─► "Como você usa o Telemetrix?"
              ├─ Motorista           ─► fluxo atual
              ├─ Motorista de app    ─► fluxo atual + plataformas que usa
              ├─ Instrutor autônomo  ─► cria automaticamente sua "escola" de 1 pessoa
              └─ Autoescola          ─► nome da autoescola, depois convida instrutores

Convite por e-mail/link ─► instrutor ou aluno cria conta já vinculado à escola
```

## Fases (uma por vez, com validação antes de avançar)

### Fase A — Perfil da conta e app adaptável
- Tabela de perfil do usuário com o modo escolhido.
- Tela de escolha do modo no primeiro acesso (e em Ajustes).
- Menu inferior, painel inicial e atalhos mudam conforme o modo. Motorista fica idêntico ao de hoje.
- Site público: uma página por perfil (`/para/motorista-de-app`, `/para/instrutor`, `/para/autoescola`) e os mockups na demo.

### Fase B — Motorista de app (Uber/99)
- Corridas: lançamento em 2 toques (plataforma, valor, km, gorjeta), com opção de anexar à viagem gravada do dia.
- Turnos: iniciar/encerrar turno; o app soma km rodados, combustível estimado e corridas do período.
- Painel "Meu lucro": ganhos − combustível − despesas = lucro do dia/semana/mês, R$/km e R$/hora.
- Relatório semanal no formato que o motorista já vê no Uber (seg–dom).
- Manutenção: metas por rodagem alta (ex.: troca de óleo a cada 5.000 km em uso intenso).

### Fase C — Instrutor autônomo e alunos
- Estrutura de "escola" (mesmo modelo usado pela autoescola, mas com 1 instrutor).
- Alunos: cadastro, foto, categoria pretendida, processo/RENACH, aulas contratadas x realizadas.
- Aulas: agendar (data, hora, aluno, carro), iniciar/encerrar; ao encerrar, a viagem gravada pelo OBD/rastreador vira o trajeto da aula com Eco Score e eventos (freada brusca etc.) como avaliação.
- Observações e checklist da aula (baliza, embreagem, sinalização…).
- Financeiro: valor por aula, pacotes, pago/pendente.
- Convite do aluno por link; aluno entra e vê "Meu progresso".

### Fase D — Autoescola (equipe)
- Convite de instrutores (login próprio), vínculo instrutor ↔ carros.
- Agenda geral: quem está com qual carro, conflitos de horário.
- Visão do dono: aulas por instrutor, km e combustível por carro, custo por aula, ranking de instrutores (reaproveita o ranking de motoristas).
- Alunos podem ser atendidos por mais de um instrutor.

### Fase E — Planos e limites por perfil
- Os planos continuam Free/Pro/Frota; entram novos limites: nº de alunos, nº de instrutores, corridas por mês. Textos dos planos ganham exemplos por perfil.

## Detalhes técnicos

- **Perfil**: tabela `profiles` (`user_id`, `mode` enum `motorista|app|instrutor|autoescola`, `display_name`), criada por trigger no cadastro. Contexto React `useAccountMode` alimenta menu/painel.
- **Multi-conta (escola)**: tabelas `organizations` (escola), `organization_members` (`org_id`, `user_id`, `role` enum `owner|instructor|student`) e `organization_invites` (token, e-mail, papel). Papéis ficam em tabela separada do perfil, com função `has_org_role()` SECURITY DEFINER para as políticas RLS, evitando recursão.
- **Escopo dos dados**: `vehicles`, `drivers` e `trips` ganham `org_id` opcional; políticas RLS permitem leitura pelos membros da escola conforme o papel (instrutor vê seus carros/aulas; aluno vê só as próprias aulas; dono vê tudo). Contas Motorista/App continuam só com `user_id`, sem mudança de comportamento.
- **Ensino**: `students` (dados do aluno, `user_id` opcional até aceitar o convite), `lessons` (`org_id`, `student_id`, `instructor_id`, `vehicle_id`, `scheduled_at`, `started_at`, `ended_at`, `trip_id`, `status`, `notes`, `checklist jsonb`, `price`, `paid`). Instrutor vira um `drivers` da escola para reaproveitar Eco Score e ranking.
- **Uber/99**: `rides` (`user_id`, `platform`, `amount`, `tip`, `distance_km`, `trip_id` opcional, `shift_id`, `occurred_at`) e `shifts` (`started_at`, `ended_at`, `start_mileage`, `end_mileage`). Cálculos de lucro em módulo puro com testes (vitest), no padrão de `fuel/metrics.ts`.
- **Convites**: rota pública `/convite/$token` que, após login, chama RPC `accept_org_invite` (SECURITY DEFINER), mesmo padrão de `accept_vehicle_share`.
- **Gate de rotas**: componente semelhante ao `ObserverGate` redireciona aluno para `/aluno` e mantém instrutor fora das telas de dono.
- Todas as tabelas novas com GRANTs, RLS, `created_at/updated_at` e trigger de `updated_at`.

## Ordem sugerida

A → B → C → D → E. A Fase A é curta e destrava as demais; B é independente de C/D e pode ser priorizada se o público de motoristas de app for o alvo comercial primeiro. Começo pela Fase A assim que aprovado.
