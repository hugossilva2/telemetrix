## 1. Painel em "Modo Viagem" (foco em tempo real)

Quando o motor está ligado **e** existe viagem ativa, o painel entra em modo foco:

Fica visível:
- Cabeçalho de status (ignição, GPS/satélites, conexão)
- KPIs ao vivo: velocidade, RPM, combustível, odômetro, consumo instantâneo
- Mini-mapa + cronômetro/distância/destino (card de viagem em andamento), ampliado
- Card do veículo + motorista ao volante

Fica oculto (volta quando o carro desliga):
- Locais salvos / ETA de favoritos
- Partida Segura
- Pareamento Bluetooth
- Alertas de manutenção, documentos vencendo, destaque de motorista

Um botão discreto "Ver tudo" permite expandir os cards ocultos sem sair da viagem, e a preferência não persiste (volta ao foco na próxima viagem).

## 2. Excluir viagem definitivamente

- Botão de excluir (ícone lixeira) no card de cada viagem em `/viagens` e no topo do detalhe `/viagens/:id`, com diálogo de confirmação.
- Exclusão real do registro (e dos eventos ligados a ela), com atualização imediata das listas e dos números de relatórios, eco score e médias de consumo.
- Não é possível excluir a viagem em andamento — só depois de encerrada.

## 3. Usuário secundário (somente visualização)

Fluxo escolhido: convite por e-mail, acesso restrito a rastreamento.

Dono do carro:
- Nova seção em Ajustes: "Compartilhar rastreamento" — informar e-mail, ver lista de convidados (pendente/ativo) e revogar acesso a qualquer momento.

Convidado:
- Cria conta (ou entra) com o mesmo e-mail; o vínculo é ativado automaticamente.
- Entra em uma tela dedicada de acompanhamento: mapa ao vivo com posição do carro, ignição ligada/desligada, velocidade, último local estacionado, viagem em andamento (tempo, distância, destino se houver) e horário da última atualização.
- Não vê nem acessa: despesas, abastecimentos, manutenção, documentos, motoristas, relatórios, eco score, automações, ajustes. Nenhuma ação de escrita.
- Se a pessoa tem carro próprio e também é convidada, aparece um seletor para alternar entre "Meu veículo" e "Acompanhando".

### Detalhes técnicos

- Nova tabela `vehicle_shares` (owner_id, vehicle_id, invited_email normalizado, viewer_user_id, status, timestamps) com GRANTs e RLS: dono gerencia suas linhas; convidado lê apenas as linhas onde é o convidado.
- Função `security definer` `public.can_view_vehicle(_vehicle_id uuid)` usada em políticas **SELECT adicionais** (sem afetar as atuais) somente em: `vehicles` (colunas expostas via view segura: nome, placa, modo rastreador), `tracker_pings`, `device_trip_state`, `tracker_events`, `trips` (dados de rota/tempo). Nada de despesas, documentos, motoristas ou abastecimentos.
- Vinculação do convite: trigger em `auth.users` (criação e confirmação de e-mail) que preenche `viewer_user_id` apenas quando o e-mail está confirmado, evitando acesso por e-mail não verificado.
- A tela do convidado não usa credenciais MQTT do dono: lê `device_trip_state` + `tracker_pings` via Supabase com Realtime, para não expor o token da telemetria.
- Exclusão de viagem: server function autenticada (RLS do próprio usuário) apagando `trips` e `tracker_events` relacionados, com invalidação das queries de viagens, eco e relatórios.
- Painel: novo componente de layout que decide foco vs completo a partir de `ignitionOn` + viagem ativa, mantendo todos os cards existentes intactos.

Sugiro implementar em duas etapas: primeiro (1) e (2), validar em uso real, e depois o compartilhamento (3), que envolve banco e convite.
