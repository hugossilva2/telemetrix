# Autonomia ao vivo + posto mais próximo no Painel

## O que o usuário vai ver

No painel (`/inicio`), abaixo dos mostradores neon, um novo cartão **Autonomia**:

- Km restantes estimados com o consumo real da viagem atual (queda do nível de combustível por km rodado); se ainda não houver dados suficientes, usa o km/L do veículo ajustado pelo estilo de condução.
- Consumo instantâneo mostrado em km/L e a leitura do tanque em % e litros.
- Semáforo: verde (folgado), amarelo (atenção), vermelho (reserva).
- Quando o tanque cai abaixo de ~15% (um ponto antes da reserva de 10%): o cartão fica em alerta com a mensagem "Hora de abastecer" e lista os **3 postos mais próximos** com nome, distância e tempo estimado de chegada. Cada item abre a navegação no mapa (Google Maps/app padrão do celular).
- Um toast único avisa a entrada no nível de abastecimento (não repete a cada pacote de telemetria).
- Com o motor desligado o cartão fica esmaecido e mostra a última autonomia conhecida.

## Como funciona por trás

**Consumo em tempo real** — novo módulo puro `src/lib/eco/autonomy.ts`:
- Acumula amostras (odômetro/posição + `fuelLevel`) durante a viagem aberta; km/L real = km rodados ÷ litros consumidos (litros = Δ% × capacidade do tanque).
- Só considera válido com pelo menos ~2 km rodados e ~1% de queda no tanque; abaixo disso cai no fallback: `expectedKmpl` da ficha técnica penalizado pela nota instantânea de `gradeLive` (condução agressiva reduz o km/L).
- Autonomia = litros utilizáveis (descontando a reserva de 10%) × km/L, reaproveitando `autonomyKm` de `src/lib/trips/longTrip.ts`.
- Suavização por média móvel para o número não oscilar a cada pacote.

**Estado ao vivo** — novo hook `src/hooks/useLiveAutonomy.ts`: lê `useTelemetry`, `useOpenTrip` e `useActiveVehicle`, mantém as amostras em ref e devolve `{ kmpl, source: "medido" | "estimado", fuelPct, liters, autonomyKm, level, needsRefuel }`.

**Postos próximos** — nova server function `nearbyGasStations` em `src/lib/places.functions.ts` (mesmo padrão autenticado já usado ali): `places/v1/places:searchNearby` via gateway do Google Maps, `includedTypes: ["gas_station"]`, raio 5 km (com nova tentativa em 15 km se vazio), field mask com id/nome/endereço/localização, ordenado por distância e limitado a 3. O ETA de cada posto reutiliza `getRouteEta`, como já é feito no cartão de lugares favoritos. A busca só é disparada quando o alerta de abastecimento está ativo (evita chamadas desnecessárias) e é cacheada por posição arredondada.

**UI** — novo componente `src/components/dashboard/AutonomyCard.tsx` usando `card-surface` e tokens semânticos existentes (`success` / `warning` / `destructive`), sem cores fixas. Inserido em `src/routes/_authenticated/inicio.tsx` logo após `<GaugeCluster />`, e incluído no bloco primário (visível também no modo viagem).

Sem mudanças de banco de dados.
