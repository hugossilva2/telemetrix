## Objetivo

Transformar os locais favoritos em cercas virtuais reais (raio configurável, padrão 500 m) que, ao serem cruzadas pelo FMC003, disparam uma chamada HTTP para o seu sistema de casa inteligente (Home Assistant, Tuya, IFTTT, Alexa, portão etc.).

Hoje o app só detecta **saída** de cerca e apenas registra um evento na timeline. Vamos adicionar **entrada/aproximação** e a ação externa.

## O que muda

### 1. Banco de dados
- `favorite_places`: novo padrão de raio 500 m para novas cercas (os locais atuais continuam com o valor deles; dá para editar na tela).
- Novo tipo de evento `geofence_enter` (hoje só existe `geofence_exit`).
- Nova tabela `place_automations`: por local e por gatilho (entrada ou saída), guarda a URL de destino, método (GET/POST), corpo JSON opcional, cabeçalho de autenticação opcional, se está ativa e quanto tempo de espera entre disparos (anti-repetição).
- Nova tabela `automation_runs`: histórico dos disparos (data, local, gatilho, status HTTP, erro) para você ver o que funcionou.
- Regras de acesso: cada usuário só vê e edita as próprias automações e o próprio histórico.

### 2. Detecção no servidor (webhook do Flespi)
No `src/routes/api/public/flespi-webhook.ts`:
- Passar a detectar as duas transições: fora → dentro (`geofence_enter`) e dentro → fora (`geofence_exit`), com histerese (entra com raio, sai só depois de ~15% além do raio) para não disparar em looping quando o GPS oscila na borda.
- Em cada transição, buscar as automações ativas daquele local + gatilho e fazer a chamada HTTP (com timeout curto, sem travar o processamento das outras mensagens), gravando o resultado em `automation_runs` e respeitando o intervalo mínimo entre disparos.

### 3. Tela de configuração
Na página **Locais** (`/lugares`), cada local ganha um painel "Automação":
- Liga/desliga a cerca e ajusta o raio (slider 100 m – 2 km, padrão 500 m).
- Para "Ao chegar" e "Ao sair": URL, método, corpo JSON opcional, cabeçalho opcional (ex.: `Authorization: Bearer ...`), intervalo mínimo entre disparos.
- Botão **Testar agora** que executa a chamada na hora e mostra o status retornado.
- Lista dos últimos disparos com status (ok / erro).

### 4. Timeline
No `/rastreador`, os eventos de entrada aparecem junto com os de saída, com rótulo do local ("Chegou em Casa" / "Saiu de Casa").

## Detalhes técnicos

- A chamada externa sai do servidor (rota TanStack + service role), nunca do navegador; a URL/segredo do seu sistema fica no banco protegido por RLS e nunca é exposto ao cliente.
- Teste manual via `createServerFn` autenticado, que valida se a URL é http(s) e bloqueia endereços internos/loopback antes de chamar.
- Cálculo de distância continua com Haversine; o estado dentro/fora já é persistido em `device_trip_state.geofence_state`.
- Notificação push real fica de fora desta fase (você escolheu só o webhook); se seu Home Assistant já manda push, ele cobre isso.

## Fora do escopo

Push notifications nativas, integração direta com Alexa/Google Home (só via URL/webhook do seu hub).
