# Consertar rastreamento (FMC003) e revisar modo observador

## O que está errado hoje (verificado no banco e no código)

1. **Nenhum evento de segurança existe.** A tabela `tracker_events` tem **0 registros**. Todos os eventos (motor ligado/desligado, movimento suspeito, cerca virtual, sinal perdido) só são criados pelo endpoint que a Flespi deve chamar — e não há nenhum log de chamada dele.
2. **A URL do webhook no projeto está desatualizada.** Os comentários de configuração apontam para `drive-wise-69.lovable.app`, mas o app publicado hoje é `telemetrix.lovable.app`. Se o canal da Flespi ainda aponta para o domínio antigo, nenhuma mensagem chega ao app.
3. **A posição só atualiza com o app aberto.** Os 488 pontos de rastreio têm cadência de 1–2 por minuto e param exatamente às 17:26 de hoje — é o espelhamento feito pelo app do dono. Sem o app aberto, o observador vê a posição congelada.
4. **Interruptor morto do "modo rastreador".** O veículo está com `tracker_mode = false` e nenhuma tela grava esse campo. A rotina de "sinal perdido" só olha veículos com esse campo ligado, então nunca processa nada.
5. **Observador (`/acompanhar`): permissões e leitura estão corretas.** Há 1 compartilhamento ativo, e as regras de acesso do veículo, estado ao vivo, pontos, viagens e eventos estão liberadas para o convidado. Os problemas que o observador vê ("Nenhum evento registrado", mapa parado) são consequência dos itens 1–3, não da tela.

## Fase A — Eventos, alertas e canal da Flespi

1. **Diagnosticar o canal Flespi de ponta a ponta**: usar o token da conta para listar o device 8634775, ver a última mensagem recebida na Flespi e conferir se existe um canal/stream de webhook apontando para o app. Reportar o resultado antes de mexer em qualquer configuração externa.
2. **Testar o endpoint do webhook** enviando uma mensagem simulada (ignição ON, depois OFF, com coordenadas) para a URL correta com o segredo já configurado, e confirmar no banco que foram gravados: estado do dispositivo, pontos e os eventos de motor ligado/desligado.
3. **Corrigir a URL de referência** nos comentários/documentação do webhook e do heartbeat para o domínio atual, e registrar no README a URL exata a colar na Flespi.
4. **Rede de segurança no app**: gerar os eventos de motor ligado/desligado e movimento suspeito também a partir da telemetria lida pelo app (mesmo caminho que já espelha a posição), com proteção contra duplicidade quando o webhook também gravar. Assim o histórico e os alertas funcionam mesmo se o canal externo falhar.
5. **Ligar o "modo rastreador" de verdade**: adicionar o controle na tela de veículos/ajustes para ativar `tracker_mode` e os alertas, e ativar para o veículo atual.
6. **Validação da Fase A**: navegar pelo app com Playwright em `/rastreador` e `/acompanhar` e confirmar que os eventos aparecem na linha do tempo; conferir os registros no banco.

## Fase B — Posição contínua sem o app aberto

1. Confirmar que o canal da Flespi entrega mensagens 24h e que cada mensagem grava ponto + estado no banco (é o webhook que já existe, apenas precisa estar recebendo).
2. Agendar a rotina de "sinal perdido" (a cada 5 min) para que a ausência de mensagens gere alerta e notificação em vez de silêncio.
3. Ajustar a tela do observador para diferenciar "ao vivo" de "última posição conhecida há X min", evitando a impressão de que o carro está parado ali.
4. Validação: comparar a cadência de pontos com o app fechado antes e depois.

## Notas técnicas

- Fontes de escrita: `src/routes/api/public/flespi-webhook.ts` (servidor, 24h) e `src/hooks/useLivePublish.ts` → `src/lib/tracker/livePublish.functions.ts` (cliente, app aberto). Hoje só a segunda está gravando.
- A geração de eventos no cliente entra em um novo hook montado junto do `TripRecorder`, escrevendo via server function com verificação do último evento do mesmo tipo para não duplicar.
- Heartbeat: `src/routes/api/public/tracker-heartbeat.ts`, filtro `tracker_mode = true` + `alert_signal_lost = true`.
- Nada de mudança de esquema é esperado na Fase A; se a deduplicação exigir índice, será uma migração pequena e isolada.

Fase A primeiro, com teste e validação, antes de seguir para a Fase B.
