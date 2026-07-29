## Situação atual

- `useOBD2Local` guarda o nome do adaptador só em estado React — ao recarregar o app, some.
- Nada sobre o ELM327 é salvo no banco; não há registro de "primeira conexão".
- O aviso de pareamento é um texto fixo no card do Painel, igual na 1ª e na 100ª vez.

## O que fazer

### 1. Memória local do adaptador
- Novo módulo `src/lib/obd/device.ts`: guarda no localStorage `{ id, name, firstPairedAt, lastConnectedAt }`.
- `useOBD2Local.connect()` grava/atualiza esse registro ao conectar com sucesso.
- Expor `savedDevice` pelo hook e pelo `TelemetryState`.

### 2. Primeira conexão x reconexão (UI)
- `BluetoothPairCard` passa a ter dois estados:
  - **Sem adaptador salvo (1ª vez):** título "Parear adaptador OBD-II", passos curtos — plugue o ELM327 na porta OBD, ligue o Bluetooth do celular, use o Chrome no Android, toque em "Parear Bluetooth" e escolha o dispositivo na lista do navegador.
  - **Com adaptador salvo:** "Reconectar a <nome>" com botão único, sem o passo a passo.
- Mantém o aviso de Web Bluetooth indisponível.

### 3. Ajustes
- `DataSourceCard` mostra o adaptador memorizado (nome + data do 1º pareamento) mesmo desconectado, com ação "Esquecer adaptador" que limpa o registro.

### 4. Persistência no Supabase (opcional, incluída)
- Colunas em `vehicles`: `obd_device_name`, `obd_device_id`, `obd_first_paired_at`.
- Gravadas na primeira conexão bem-sucedida, para o histórico do veículo ficar consistente entre dispositivos.

## Detalhes técnicos

- O navegador não permite reconectar sem gesto do usuário na primeira vez em cada sessão; então "reconectar" continua sendo um clique — só que com rótulo e contexto certos.
- `device.id` da Web Bluetooth é estável por origem, serve como chave.
- Nenhuma mudança no polling de PIDs nem no fluxo de viagens.
