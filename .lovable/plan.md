
# Arquitetura híbrida de telemetria: FMC003 (nuvem) + ELM327 (Bluetooth local)

Hoje 13 arquivos chamam `useFlespiMqtt()` diretamente (dashboard, mapa, rastreador, planejar, manutenção, abastecimento, trip tracker, cards). Para suportar duas fontes de dados sem duplicar telas, todos passam a consumir um único contexto.

## Fase 1 — Camada de abstração (Adapter Pattern)

`src/lib/telemetry/types.ts`
- `TelemetrySource = "fmc003" | "elm327"`, `TelemetryStatus`, e o estado unificado
  `{ source, status, data: VehicleTelemetry, lastMessageAt, error }`.
- Reaproveita a interface `VehicleTelemetry` existente (lat, lng, speedKmh, engineRpm, fuelLevel, batteryVoltage, mileageKm, ignitionOn…) — nada de novo formato para não quebrar eco-score, viagens e manutenção.

`src/lib/telemetry/source.ts`
- Preferência do usuário persistida em `localStorage` (`telemetrix:source`), com hook `useTelemetrySource()` e default `fmc003`.

`src/components/telemetry/TelemetryProvider.tsx`
- Monta o adapter conforme a fonte escolhida e expõe `useTelemetry()`.
- Como hooks não podem ser condicionais, o Provider renderiza um de dois subcomponentes "bridge" (`FlespiBridge` / `ObdBridge`) que chamam seu respectivo hook e publicam no contexto.
- Registrado dentro de `src/routes/_authenticated/route.tsx`, envolvendo `TripRecorder` + `Outlet`.

`src/hooks/useTelemetry.ts` — compatibilidade: retorna `{ status, telemetry, lastMessageAt }` no mesmo shape de hoje, para trocar as 13 chamadas de `useFlespiMqtt()` por `useTelemetry()` com edição mínima.

## Fase 2 — Modo Econômico: ELM327 via Web Bluetooth + GPS

`src/lib/obd/pids.ts` — encoders/decoders dos comandos AT e PIDs: `010C` (RPM), `010D` (velocidade), `0105` (temp. do motor), `012F` (nível de combustível), `0142` (tensão do módulo), `0104` (carga do motor).

`src/lib/obd/elm327.ts` — cliente de transporte:
- `navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [...] })` (ELM327 BLE usa UUIDs variados: 0xFFF0, 0xFFE0, serial genérico) → GATT → characteristic de write + notify.
- Handshake `ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATSP0`; fila de comandos serializada com timeout, buffer até o prompt `>`, parsing de `41 0C ...`.
- Loop de polling (~500 ms) alternando os PIDs, com reconexão em `gattserverdisconnected`.

`src/hooks/useOBD2Local.ts`
- Estado de conexão + telemetria; `connect()` chama o modal nativo do navegador (precisa de gesto do usuário).
- GPS em paralelo: `navigator.geolocation.watchPosition` (`enableHighAccuracy`) alimenta lat/lng, `heading` e velocidade GPS como fallback quando o CAN não responde.
- `ignitionOn` derivado: motor considerado ligado quando RPM > 300 (o ELM327 só responde com a chave ligada).
- Consumo estimado no frontend: MAF calculado a partir de RPM/carga quando disponível; caso não, estimativa por velocidade + `avg_consumption_kmpl` do veículo (mesma lógica já usada em `LiveConsumptionCard`).
- Odômetro: OBD-II não expõe km total; a distância vem do GPS (Haversine, já existe em `src/lib/trips/geo.ts`).

## Fase 3 — UI/UX

- **Ajustes** (`ajustes.tsx`): novo card "Fonte de dados" com Radio Group estilizado — "Equipamento dedicado (nuvem)" vs "Adaptador OBD-II (Bluetooth local)". No modo nuvem mantém o campo Device ID Flespi; no modo local mostra o dispositivo pareado e botão de desconectar.
- **Header do Dashboard** (`StatusHeader.tsx`): badge com a fonte ativa (ícone nuvem/bluetooth) + status da conexão, reaproveitando os tokens `success`/`warning`/`destructive`.
- **Dashboard** (`index.tsx`): quando o modo Econômico está ativo e não há conexão, exibe card com botão "Parear Bluetooth" (chama `connect()`); avisa se o navegador não suportar Web Bluetooth.

## Fase 4 — Banco de dados e persistência

- Migração: `ALTER TABLE public.trips ADD COLUMN hardware_source text NOT NULL DEFAULT 'fmc003'` (valores `fmc003` | `elm327`, validado por trigger em vez de CHECK).
- `src/lib/trips/saveTrip.ts` e `useLiveTripTracker.ts` passam a gravar `hardware_source` a partir do contexto; abastecimentos (`fuel_logs`) e o restante seguem inalterados.
- `viagens.tsx` / `viagens.$id.tsx`: badge indicando a origem da rota.

## Fase 5 (opcional, se você quiser) — Offline-first

Buffer de pontos em IndexedDB durante a viagem e sincronização em lote quando a rede voltar. Fica para uma etapa separada, depois de validarmos o Bluetooth no carro.

## Detalhes técnicos e limitações

- Web Bluetooth só funciona em Chrome/Edge Android e desktop, sob HTTPS, e **não** funciona em iOS/Safari nem dentro do iframe do preview do editor sem permissão — o pareamento precisa ser testado no app publicado, aberto em aba própria no Android.
- O webhook Flespi (`/api/public/flespi-webhook`) e o heartbeat continuam funcionando para o modo nuvem; no modo local todo o processamento é no cliente.
- Nada é removido do modo atual: se você não trocar a chave, o comportamento fica idêntico ao de hoje.

Vou implementar por fases, pausando para você validar antes de avançar. Começo pelas Fases 1 e 2 (contexto + hook OBD) e paro para revisão.
