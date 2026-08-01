## Objetivo

Dar autonomia à conta observadora: poder sair do app e ter mais informação útil enquanto acompanha o veículo à distância.

## 1. Botão "Sair" acessível ao observador (bug)

Hoje o único `signOut` do app está em `/ajustes`, rota bloqueada pelo `ObserverGate` — logo o observador fica preso na conta.

- Extrair a lógica de logout para um componente reutilizável `SignOutButton` (cancelar queries → limpar cache → `supabase.auth.signOut()` → `navigate("/auth", { replace: true })`).
- Usar esse componente em `/ajustes` (mesmo comportamento de hoje) e no header de `/acompanhar`, junto ao e-mail da conta logada, para que o observador sempre consiga sair.

## 2. Endereço atual + abrir/compartilhar no Maps

- Nova server function que faz geocodificação reversa da última posição pelo gateway do Google Maps (chave de servidor, nunca no navegador), com cache curto.
- Em `/acompanhar`: linha com o endereço aproximado abaixo do status, botão **Abrir no Google Maps** (link `google.com/maps?q=lat,lng`) e botão **Compartilhar** usando `navigator.share` com fallback de copiar link.

## 3. Histórico de viagens somente leitura

- Migração: adicionar política de leitura em `trips` para veículos compartilhados (usa a função existente `can_view_vehicle`), mantendo as demais operações restritas ao dono.
- Em `/acompanhar`, seção "Últimas viagens" (10 mais recentes do veículo compartilhado): data/hora, duração, distância, velocidade média e máxima; ao tocar, expande um mini-mapa com o traçado da viagem. Nenhuma ação de editar ou excluir para o observador.

## 4. Notificações push para o observador

- O observador já pode registrar o próprio dispositivo (`push_subscriptions` é por usuário); reaproveitar o `PushNotificationsCard` num bloco compacto dentro de `/acompanhar` (sem o botão de teste do dono, mas com o "Testar" próprio).
- No envio de eventos (`send.server.ts`), além do dono do veículo, buscar em `vehicle_shares` os observadores ativos (`revoked_at IS NULL`, `viewer_user_id` preenchido) daquele veículo e enviar a mesma notificação para eles. Eventos cobertos: ignição ON/OFF, movimento suspeito, entrada/saída de cerca, perda de sinal.

## Detalhes técnicos

- `src/components/auth/SignOutButton.tsx` novo; `ajustes.tsx` e `acompanhar.tsx` passam a consumi-lo.
- `src/lib/geo/reverse.functions.ts`: `createServerFn` + `requireSupabaseAuth`, gateway `maps/api/geocode/json`, tratamento explícito de 403 (`API_KEY_HTTP_REFERRER_BLOCKED` / `API_KEY_SERVICE_BLOCKED`).
- `send.server.ts`: nova função `resolveRecipients(vehicleId, ownerId)` retornando dono + observadores; `sendTrackerEventPush` itera sobre ela.
- `/acompanhar` cresce; extrair os blocos novos em `src/components/observer/*` (`ObserverAddressCard`, `ObserverTripsList`) para manter a rota legível.

## Fora de escopo

Locais salvos/ETA para o observador (fica para uma fase seguinte, se você quiser).
