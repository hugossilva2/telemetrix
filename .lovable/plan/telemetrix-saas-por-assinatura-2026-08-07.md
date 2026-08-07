# Telemetrix → SaaS por assinatura

Objetivo: transformar o app (hoje de uso pessoal, um veículo, ficha técnica do Fiat Cronos fixa no código) em um produto comercializável por assinatura mensal, com página de vendas, planos e checkout.

## Situação atual (verificada no projeto)

- Todas as tabelas já têm `user_id` e RLS, então o isolamento por conta existe.
- A tabela `vehicles` existe, mas o app é single-vehicle na prática: a ficha técnica vem de `ACTIVE_SPEC` (constante do Cronos 1.3) e não do banco.
- Não existe rota pública `/`: hoje `/` é a dashboard autenticada. Não há landing page, nem página de planos, nem cobrança.
- Não existe noção de plano/limite/assinatura em nenhuma tabela.

## Fases

### Fase 1 — Multi-veículo (pré-requisito)
- Nova tabela `vehicle_specs` (ou colunas em `vehicles`) com tanque, consumo Inmetro, faixa eco de RPM, potência, etc., com valores padrão razoáveis.
- Seletor de veículo no cabeçalho + contexto `useActiveVehicle`, persistido por usuário.
- Substituir todos os usos de `ACTIVE_SPEC` pelo veículo ativo (viagem longa, eco score, partida segura, consumo, saúde do veículo).
- Todas as consultas passam a filtrar por `vehicle_id` ativo.
- CRUD de veículos (criar, editar, remover) com onboarding: primeiro acesso pede placa, modelo e fonte de dados (Flespi ou ELM327).

### Fase 2 — Planos e limites
- Tabelas `subscriptions` (plano, status, período) e leitura por `entitlements` derivados.
- Definição dos planos:
  - **Free** — 1 veículo, histórico de 7 dias, sem eco score avançado, sem observadores, sem relatórios.
  - **Pro** — 1 veículo, histórico ilimitado, eco score, viagem longa, rastreador, automações, push, observadores.
  - **Frota** — vários veículos, motoristas e ranking, relatórios e exportação, mais observadores.
- Hook `useEntitlements` + componente de bloqueio (`<PlanGate>`) aplicado nas rotas/recursos pagos, com CTA de upgrade.
- Regras de limite também no servidor (server functions) para não depender só da UI.

### Fase 3 — Página de apresentação pública
- Nova rota pública `/` (landing) e a dashboard atual passa para `/app` (ou mantém-se em `_authenticated/inicio`), com redirecionamento de usuário logado.
- Seções: herói com proposta de valor, mockups do app, funcionalidades (telemetria ao vivo, rastreador, eco score, viagem longa, manutenção, documentos, motoristas), como funciona (ELM327 ou rastreador Flespi), planos, FAQ, rodapé com privacidade/termos.
- Mockups gerados por IA em molduras de celular, no visual Neon Mint do app.
- SEO: `head()` próprio em cada rota pública (title, description, og:*, twitter), JSON-LD de SoftwareApplication, `robots.txt` e `sitemap.xml`.

### Fase 4 — Pagamento
- Ativar os pagamentos gerenciados pela Lovable (Stripe), criar os produtos Pro e Frota (mensal e anual) e a página `/planos` com checkout.
- Webhook de pagamento atualizando `subscriptions`; página de sucesso/retorno; área "Minha assinatura" em Ajustes (plano atual, trocar plano, cancelar).

### Fase 5 — Pronto para comercializar (lacunas a fechar)
- Autenticação: recuperação de senha (rota `/reset-password`) e login social.
- Onboarding guiado e estado vazio (o app hoje assume dados existentes).
- Páginas legais: privacidade, termos e exclusão de conta/dados (obrigatório para rastreamento de localização).
- Convite/observadores por e-mail com envio real de e-mail.
- Suporte: canal de contato e página de ajuda.
- Verificação da chave de serviço do Supabase (erro atual de `SUPABASE_SERVICE_ROLE_KEY` no preview) e uma varredura de segurança antes de publicar.

## Detalhes técnicos

- Multi-veículo: contexto React + `localStorage` para o veículo ativo, com fallback para o primeiro veículo do usuário; specs viram dados (`vehicle_specs`) mantendo o Cronos como preset.
- Entitlements: função `has_plan_feature`/leitura de `subscriptions` via server function autenticada; limites checados nas server functions de escrita, não só na UI.
- Landing pública: rota SSR com `head()` próprio; nenhuma chamada a server function protegida no loader.
- Assinaturas: `subscriptions` com `user_id`, `plan`, `status`, `current_period_end`, atualizada por rota `api/public/*` com verificação de assinatura do webhook.

## Ordem de execução

Fase 1 → 2 → 3 → 4 → 5, validando cada fase antes de avançar. Começo pela Fase 1 (multi-veículo), que é pré-requisito das outras.
