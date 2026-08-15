# Fase 7 — Mensagens de erro em português comum

Hoje o usuário recebe jargão de banco de dados ("new row violates row-level security policy for table drivers"). A correção separa dois tipos de erro: os que a gente escreveu de propósito (chegam ao usuário como estão) e os de infraestrutura (viram uma mensagem que diz o que aconteceu e o que fazer, com o detalhe técnico só no console).

## 1. Novo utilitário `src/lib/errors/userMessage.ts`

- `toUserMessage(error: unknown, fallback: string): string`.
- Classe `AppError` para erros intencionais de domínio — a mensagem passa limpa ao usuário.
- Reconhece como infraestrutura (usa o fallback): objetos com `code`/`details`/`hint` (PostgrestError) e mensagens contendo `row-level security`, `duplicate key`, `violates`, `JWT`, `permission denied`, `fetch failed`, `NetworkError`, `Failed to fetch`, `Unauthorized`, `500`/`Internal`.
- Heurística para mensagens não classificadas: texto em português já escrito por nós (sem vocabulário técnico) passa; o resto cai no fallback.
- Sempre `console.error` com o erro original.

## 2. Trocar os toasts crus

Substituir `toast.error(e.message)` por `toast.error(toUserMessage(e, "<ação concreta>"))`, com o fallback nomeando a ação:

- Motorista: "Não foi possível salvar o motorista. Verifique sua conexão e tente de novo."
- Excluir viagem: "Não foi possível excluir a viagem. Tente de novo em instantes."
- Automação de lugar: "Não foi possível salvar a automação. Verifique a URL e tente de novo."
- Conferência (checkups): "Não foi possível registrar a conferência. Tente de novo."
- Notificações push: "Não foi possível atualizar as notificações neste dispositivo."

O critério de aceite é `grep` sem resultados em todo `src/`, então além dos arquivos citados (`DriverEditDialog`, `CheckupButtons`, `PlaceAutomationPanel`, `PushNotificationsCard`, `DeleteTripButton`) o mesmo tratamento vai para as telas que hoje repassam `e.message` direto, cada uma com fallback próprio da sua ação: veículos, documentos, motoristas, abastecimento, despesas, manutenção, lugares, ajustes, compartilhar, rastreador, viagens (importar histórico), planejar, coach e abertura de arquivos anexados. Login/cadastro (`auth.tsx`) também passa pelo utilitário, com fallback "Não foi possível entrar. Confira os dados e tente de novo." / "Não foi possível criar a conta. Tente de novo."

## 3. Server functions param de repassar `error.message`

Em `coach.functions.ts:53`, `habits.functions.ts:30` e `automations.functions.ts:19`: `console.error` com o erro original do Supabase e `throw` de uma mensagem de domínio ("Não foi possível carregar os dados da viagem.", "Não foi possível carregar seu histórico de viagens.", "Não foi possível carregar a automação.").

## 4. Vocabulário interno removido

- `places.functions.ts:9` → "A busca de endereços está indisponível. Tente novamente em alguns minutos."
- `coach.functions.ts:44` e `habits.functions.ts:21` → "O coach de direção está indisponível no momento."

Mensagens de domínio legítimas ficam intactas — inclusive "Precisamos de pelo menos 3 viagens registradas para gerar recomendações."

## Detalhes técnicos

- `toUserMessage` fica em módulo puro (sem React, sem rede) e ganha testes em `src/lib/errors/userMessage.test.ts` na suíte vitest da fase anterior: RLS/duplicate key/PostgrestError → fallback; `AppError` e mensagens de domínio → passam; `console.error` sempre chamado (spy).
- Nenhuma mudança de lógica de negócio: só a camada de apresentação de erro e as mensagens lançadas.

## Critério de aceite

- `rg "toast.error\((e|err|error)\.message" src/` sem resultados.
- Erro de RLS forçado exibe português comum e o técnico só no console.
- `bun run test` passa, incluindo os novos testes do utilitário.
