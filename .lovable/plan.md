# Fase 1 — Fechar os dois endpoints públicos [S-02]

## Situação verificada agora

- `flespi-poll.ts` e `tracker-heartbeat.ts` aceitam a chave anon no header `apikey` — chave que é pública por design (está no bundle e no `.env`). Na prática os dois endpoints estão abertos, e ambos escrevem no banco com o cliente service role (ignora RLS).
- No banco existem **três** jobs de cron, não dois:
  - `flespi-poll` (a cada 2 min) → autentica com `apikey` (chave anon literal no comando).
  - `tracker-heartbeat` (a cada 5 min) → autentica com `apikey` (chave anon literal).
  - `telemetrix-tracker-heartbeat` (a cada 5 min) → job antigo, aponta para o domínio desativado `drive-wise-69.lovable.app` e busca o segredo no Vault. Deve ser removido.
- O Vault do projeto está **vazio** (`vault.secrets` sem registros). Ou seja, o job antigo já vinha montando a URL com segredo nulo. Como o segredo não pode ser escrito literalmente na migração, ele precisa ser cadastrado no Vault pelo painel do Supabase antes de agendar os novos jobs.

## O que será feito

### 1. Helper compartilhado de verificação
Criar `src/lib/http/verifyWebhookSecret.ts`:
- Lê `FLESPI_WEBHOOK_SECRET` dentro da função (nunca no topo do módulo).
- Sem segredo configurado → `false` (falha fechada).
- Aceita o segredo somente via header `x-webhook-secret` ou query `?secret=`.
- Comparação em tempo constante: codifica as duas strings com `TextEncoder`, compara o comprimento e acumula um XOR byte a byte, devolvendo o resultado só no fim.

### 2. Aplicar nos três endpoints
- `flespi-poll.ts`: substituir `isAuthorized` pelo helper e apagar todo o ramo da chave anon, incluindo as leituras de `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`.
- `tracker-heartbeat.ts`: mesma troca, mesmo descarte do ramo anon.
- `flespi-webhook.ts`: comportamento já correto; apenas passa a usar o helper para uniformizar.

### 3. Cadastro do segredo no Vault (ação do usuário)
Antes da migração, cadastrar no painel do Supabase (Integrations → Vault) um segredo chamado `FLESPI_WEBHOOK_SECRET` com o mesmo valor já usado pelo app. Sem isso os jobs passarão a receber 401.

### 4. Migração dos jobs do cron
Em uma única migração:
- `cron.unschedule` dos três jobs existentes (incluindo o antigo `telemetrix-tracker-heartbeat`).
- `cron.schedule` de dois jobs novos apontando para `https://telemetrix.lovable.app`, enviando o header `x-webhook-secret` cujo valor vem de `vault.decrypted_secrets` no momento da execução (nunca literal na migração):
  - `flespi-poll` — `*/2 * * * *`
  - `tracker-heartbeat` — `*/5 * * * *`

### 5. Validação
- `grep -r "SUPABASE_ANON_KEY\|SUPABASE_PUBLISHABLE_KEY" src/routes/api/` sem resultados.
- Chamada com a chave anon → 401 nos três endpoints.
- Chamada com `x-webhook-secret` correto → 200.
- `SELECT command FROM cron.job` mostrando apenas os dois jobs, com `x-webhook-secret`.
- Conferir `cron.job_run_details` após alguns minutos para garantir que os jobs voltaram a responder 200, e que novos pings continuam entrando no banco.

## Notas técnicas

- O helper fica em `src/lib/http/` (caminho seguro para o cliente), mas só é importado por rotas de servidor.
- Nenhuma mudança de esquema: a migração toca apenas em `cron.job`.
- Se o segredo do Vault não estiver cadastrado na hora da migração, o agendamento é feito de todo modo e volta a funcionar assim que o segredo existir — mas o rastreamento fica parado nesse intervalo, então o cadastro deve vir primeiro.
